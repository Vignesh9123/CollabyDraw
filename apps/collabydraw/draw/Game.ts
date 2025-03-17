import { getRoom } from "@/actions/room";
import {
  LOCALSTORAGE_CANVAS_KEY,
  Shape,
  StrokeEdge,
  StrokeStyle,
  ToolType,
} from "@/types/canvas";
import { RoughGenerator } from "roughjs/bin/generator";
import { SelectionManager } from "./SelectionManager";

const CORNER_RADIUS_FACTOR = 20;
const RECT_CORNER_RADIUS_FACTOR = CORNER_RADIUS_FACTOR;
const DIAMOND_CORNER_RADIUS_PERCENTAGE = CORNER_RADIUS_FACTOR;
const ERASER_TOLERANCE = 5;
// const WHEEL_SCALE_FACTOR = 200;
const DEFAULT_STROKE_WIDTH = 1;
const DEFAULT_STROKE_FILL = "rgba(255, 255, 255)";
const DEFAULT_BG_FILL = "rgba(18, 18, 18)";
const getDashArrayDashed = (strokeWidth: number) => [
  strokeWidth,
  strokeWidth * 4,
];
const getDashArrayDotted = (strokeWidth: number) => [
  strokeWidth,
  strokeWidth * 2,
];

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private roomId: string | null;
  private canvasBgColor: string;
  private sendMessage: ((data: string) => void) | null;
  private existingShape: Shape[];
  private clicked: boolean;
  private roomName: string | null;
  private activeTool: ToolType = "grab";
  private startX: number = 0;
  private startY: number = 0;
  private panX: number = 0;
  private panY: number = 0;
  private scale: number = 1;
  private onScaleChangeCallback: (scale: number) => void;
  public outputScale: number = 1;
  private strokeWidth: number = 1;
  private strokeFill: string = "rgba(255, 255, 255)";
  private bgFill: string = "rgba(18, 18, 18)";
  private strokeEdge: StrokeEdge = "round";
  private strokeStyle: StrokeStyle = "solid";
  private isStandalone: boolean = false;
  private static rg = new RoughGenerator();

  private selectedShape: Shape | null = null;
  private selectionManager: SelectionManager;

  constructor(
    canvas: HTMLCanvasElement,
    roomId: string | null,
    canvasBgColor: string,
    sendMessage: ((data: string) => void) | null,
    roomName: string | null,
    onScaleChangeCallback: (scale: number) => void,
    initialShapes: Shape[] = [],
    isStandalone: boolean = false
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.canvasBgColor = canvasBgColor;
    this.roomId = roomId;
    this.sendMessage = sendMessage;
    this.clicked = false;
    this.existingShape = [...initialShapes];
    this.canvas.width = document.body.clientWidth;
    this.canvas.height = document.body.clientHeight;
    this.onScaleChangeCallback = onScaleChangeCallback;
    this.roomName = roomName;
    this.init();
    this.initMouseHandler();
    this.isStandalone = isStandalone;
    this.selectionManager = new SelectionManager(this.ctx, canvas);
    // Add persistence callback
    this.selectionManager.setOnUpdate(() => {
      if (this.isStandalone) {
        localStorage.setItem(
          LOCALSTORAGE_CANVAS_KEY,
          JSON.stringify(this.existingShape)
        );
      }
    });
  }

  async init() {
    if (this.isStandalone) {
      try {
        const storedShapes = localStorage.getItem(LOCALSTORAGE_CANVAS_KEY);
        if (storedShapes) {
          const parsedShapes = JSON.parse(storedShapes);
          this.existingShape = [...this.existingShape, ...parsedShapes];
        }
      } catch (e) {
        console.error("Error loading shapes from localStorage:", e);
      }
    } else if (!this.isStandalone && this.roomName) {
      try {
        const getRoomResult = await getRoom({ roomName: this.roomName });
        if (getRoomResult?.success && getRoomResult.room?.Chat) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          getRoomResult.room.Chat.forEach((shape: any) => {
            try {
              const parsedShapes = JSON.parse(shape.message);
              const parsedShapeData = JSON.parse(parsedShapes.data);
              this.existingShape.push(parsedShapeData.shape);
            } catch (e) {
              console.error("Error parsing shape data:", e);
            }
          });
        } else if (!getRoomResult?.success) {
          console.error("Error fetching room: " + getRoomResult?.error);
        }
      } catch (error) {
        console.error("Error in init:", error);
      }
    }
    this.clearCanvas();
  }

  initMouseHandler() {
    this.canvas.addEventListener("mousedown", this.mouseDownHandler);
    this.canvas.addEventListener("mousemove", this.mouseMoveHandler);
    this.canvas.addEventListener("mouseup", this.mouseUpHandler);
    this.canvas.addEventListener("wheel", this.mouseWheelHandler, {
      passive: false,
    });
  }

  setTool(tool: ToolType) {
    this.activeTool = tool;
    if (tool !== "selection") {
      this.selectedShape = null;
      this.selectionManager.setSelectedShape(null);
      this.clearCanvas();
    }
  }

  setStrokeWidth(width: number) {
    this.strokeWidth = width;
    this.clearCanvas();
  }

  setStrokeFill(fill: string) {
    this.strokeFill = fill;
    this.clearCanvas();
  }

  setBgFill(fill: string) {
    this.bgFill = fill;
    this.clearCanvas();
  }

  updateShapes(shapes: Shape[]) {
    this.existingShape = shapes;
    this.clearCanvas();
  }

  setCanvasBgColor(color: string) {
    this.ctx.fillStyle = color;
    this.clearCanvas();
    if (this.canvasBgColor !== color) {
      this.canvasBgColor = color;
      this.clearCanvas();
    }
  }

  setStrokeEdge(edge: StrokeEdge) {
    this.strokeEdge = edge;
    this.clearCanvas();
  }

  setStrokeStyle(style: StrokeStyle) {
    this.strokeStyle = style;
    this.clearCanvas();
  }

  clearCanvas() {
    this.ctx.setTransform(this.scale, 0, 0, this.scale, this.panX, this.panY);
    this.ctx.clearRect(
      -this.panX / this.scale,
      -this.panY / this.scale,
      this.canvas.width / this.scale,
      this.canvas.height / this.scale
    );
    this.ctx.fillStyle = this.canvasBgColor;
    this.ctx.fillRect(
      -this.panX / this.scale,
      -this.panY / this.scale,
      this.canvas.width / this.scale,
      this.canvas.height / this.scale
    );
    // this.ctx.lineCap = "round";
    // this.ctx.lineJoin = "round";

    this.existingShape.map((shape: Shape) => {
      if (shape.type === "rectangle") {
        this.drawRect(
          shape.x,
          shape.y,
          shape.width,
          shape.height,
          shape.strokeWidth || DEFAULT_STROKE_WIDTH,
          shape.strokeFill || DEFAULT_STROKE_FILL,
          shape.bgFill || DEFAULT_BG_FILL,
          shape.rounded,
          shape.strokeStyle
        );
      } else if (shape.type === "ellipse") {
        this.drawEllipse(
          shape.x,
          shape.y,
          shape.radX,
          shape.radY,
          shape.strokeWidth || DEFAULT_STROKE_WIDTH,
          shape.strokeFill || DEFAULT_STROKE_FILL,
          shape.bgFill || DEFAULT_BG_FILL,
          shape.strokeStyle
        );
      } else if (shape.type === "diamond") {
        this.drawDiamond(
          shape.x,
          shape.y,
          shape.width,
          shape.height,
          shape.strokeWidth || DEFAULT_STROKE_WIDTH,
          shape.strokeFill || DEFAULT_STROKE_FILL,
          shape.bgFill || DEFAULT_BG_FILL,
          shape.rounded,
          shape.strokeStyle
        );
      } else if (shape.type === "line") {
        this.drawLine(
          shape.x,
          shape.y,
          shape.toX,
          shape.toY,
          shape.strokeWidth || DEFAULT_STROKE_WIDTH,
          shape.strokeFill || DEFAULT_STROKE_FILL,
          shape.strokeStyle
        );
      } else if (shape.type === "pen") {
        this.drawPencil(
          shape.points,
          shape.strokeWidth,
          shape.strokeFill,
          shape.strokeStyle
        );
      }
    });

    if (
      this.selectionManager.isShapeSelected() &&
      this.activeTool === "selection"
    ) {
      const selectedShape = this.selectionManager.getSelectedShape();
      if (selectedShape) {
        const bounds = this.selectionManager.getShapeBounds(selectedShape);
        this.selectionManager.drawSelectionBox(bounds);
      }
    }
  }

  mouseUpHandler = (e: MouseEvent) => {
    if (
      this.activeTool !== "pen" &&
      this.activeTool !== "eraser" &&
      this.activeTool !== "line"
    )
      if (this.activeTool === "selection") {
        if (
          this.selectionManager.isDraggingShape() ||
          this.selectionManager.isResizingShape()
        ) {
          const selectedShape = this.selectionManager.getSelectedShape();
          if (selectedShape) {
            const index = this.existingShape.findIndex(
              (shape) => shape.id === selectedShape.id
            );
            if (index !== -1) {
              this.existingShape[index] = selectedShape;
              this.clearCanvas();

              if (this.isStandalone) {
                localStorage.setItem(
                  LOCALSTORAGE_CANVAS_KEY,
                  JSON.stringify(this.existingShape)
                );
              } else if (this.sendMessage && this.roomId) {
                this.sendMessage(
                  JSON.stringify({
                    type: "update",
                    id: selectedShape.id,
                    data: JSON.stringify({ selectedShape }),
                    roomId: this.roomId,
                  })
                );
              }
            }
          }
        }
        this.selectionManager.stopDragging();
        this.selectionManager.stopResizing();
        return;
      }

    this.clicked = false;

    if (this.selectedShape) {
      localStorage.setItem(
        LOCALSTORAGE_CANVAS_KEY,
        JSON.stringify(this.existingShape)
      );
      this.clearCanvas();
    }

    const { x, y } = this.transformPanScale(e.clientX, e.clientY);

    const width = x - this.startX;
    const height = y - this.startY;

    let shape: Shape | null = null;

    switch (this.activeTool) {
      case "rectangle":
        shape = {
          id: null,
          type: "rectangle",
          x: this.startX,
          y: this.startY,
          width,
          height,
          strokeWidth: this.strokeWidth,
          strokeFill: this.strokeFill,
          bgFill: this.bgFill,
          rounded: this.strokeEdge,
          strokeStyle: this.strokeStyle,
        };
        break;

      case "ellipse":
        shape = {
          id: null,
          type: "ellipse",
          x: this.startX + width / 2,
          y: this.startY + height / 2,
          radX: Math.abs(width / 2),
          radY: Math.abs(height / 2),
          strokeWidth: this.strokeWidth,
          strokeFill: this.strokeFill,
          bgFill: this.bgFill,
          strokeStyle: this.strokeStyle,
        };
        break;

      case "diamond":
        shape = {
          id: null,
          type: "diamond",
          x: this.startX,
          y: this.startY,
          width: Math.abs(x - this.startX) * 2,
          height: Math.abs(y - this.startY) * 2,
          strokeWidth: this.strokeWidth,
          strokeFill: this.strokeFill,
          bgFill: this.bgFill,
          rounded: this.strokeEdge,
          strokeStyle: this.strokeStyle,
        };
        break;

      case "line":
        shape = {
          id: null,
          type: "line",
          x: this.startX,
          y: this.startY,
          toX: x,
          toY: y,
          strokeWidth: this.strokeWidth,
          strokeFill: this.strokeFill,
          strokeStyle: this.strokeStyle,
        };
        break;

      case "pen":
        const currentShape = this.existingShape[this.existingShape.length - 1];
        if (currentShape?.type === "pen") {
          shape = {
            id: null,
            type: "pen",
            points: currentShape.points,
            strokeWidth: this.strokeWidth,
            strokeFill: this.strokeFill,
            strokeStyle: this.strokeStyle,
          };
        }
        break;

      case "grab":
        this.startX = e.clientX;
        this.startY = e.clientY;
    }

    if (!shape) {
      return;
    }

    this.existingShape.push(shape);

    if (this.isStandalone) {
      try {
        localStorage.setItem(
          LOCALSTORAGE_CANVAS_KEY,
          JSON.stringify(this.existingShape)
        );
      } catch (e) {
        console.error("Error saving shapes to localStorage:", e);
      }
    } else if (this.sendMessage && this.roomId) {
      this.sendMessage(
        JSON.stringify({
          type: "draw",
          data: JSON.stringify({
            shape,
          }),
          roomId: this.roomId,
        })
      );
    }
  };

  mouseWheelHandler = (e: WheelEvent) => {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      const scaleAmount = -e.deltaY / 200;
      const newScale = this.scale * (1 + scaleAmount);

      const mouseX = e.clientX - this.canvas.offsetLeft;
      const mouseY = e.clientY - this.canvas.offsetTop;

      const canvasMouseX = (mouseX - this.panX) / this.scale;
      const canvasMouseY = (mouseY - this.panY) / this.scale;

      this.panX -= canvasMouseX * (newScale - this.scale);
      this.panY -= canvasMouseY * (newScale - this.scale);

      this.scale = newScale;

      this.onScaleChange(this.scale);
    } else {
      this.panX -= e.deltaX;
      this.panY -= e.deltaY;
    }

    this.clearCanvas();
  };

  mouseDownHandler = (e: MouseEvent) => {
    const { x, y } = this.transformPanScale(e.clientX, e.clientY);

    if (this.activeTool === "selection") {
      const selectedShape = this.selectionManager.getSelectedShape();
      if (selectedShape) {
        const bounds = this.selectionManager.getShapeBounds(selectedShape);
        const handle = this.selectionManager.getResizeHandleAtPoint(
          x,
          y,
          bounds
        );

        if (handle) {
          this.selectionManager.startResizing(x, y);
          return;
        }
      }
      for (let i = this.existingShape.length - 1; i >= 0; i--) {
        const shape = this.existingShape[i];

        if (this.selectionManager.isPointInShape(x, y, shape)) {
          this.selectedShape = shape;
          this.selectionManager.setSelectedShape(shape);
          this.selectionManager.startDragging(x, y);
          this.clearCanvas();
          return;
        }
      }
      this.selectedShape = null;
      this.selectionManager.setSelectedShape(null);
      this.clearCanvas();
      return;
    }

    this.clicked = true;
    this.startX = x;
    this.startY = y;

    if (this.activeTool === "pen") {
      this.existingShape.push({
        id: null,
        type: "pen",
        points: [{ x, y }],
        strokeWidth: this.strokeWidth,
        strokeFill: this.strokeFill,
        strokeStyle: this.strokeStyle,
      });
    } else if (this.activeTool === "eraser") {
      this.eraser(x, y);
    } else if (this.activeTool === "grab") {
      this.startX = e.clientX;
      this.startY = e.clientY;
    }
  };

  mouseMoveHandler = (e: MouseEvent) => {
    const { x, y } = this.transformPanScale(e.clientX, e.clientY);

    if (this.activeTool === "selection") {
      if (this.selectionManager.isDraggingShape()) {
        this.selectionManager.updateDragging(x, y);
        this.clearCanvas();
      } else if (this.selectionManager.isResizingShape()) {
        this.selectionManager.updateResizing(x, y);
        this.clearCanvas();
      }
      return;
    }

    if (this.clicked) {
      const width = x - this.startX;
      const height = y - this.startY;

      this.clearCanvas();

      switch (this.activeTool) {
        case "rectangle":
          this.drawRect(
            this.startX,
            this.startY,
            width,
            height,
            this.strokeWidth,
            this.strokeFill,
            this.bgFill,
            this.strokeEdge,
            this.strokeStyle
          );
          break;

        case "ellipse":
          this.drawEllipse(
            this.startX + width / 2,
            this.startY + height / 2,
            Math.abs(width / 2),
            Math.abs(height / 2),
            this.strokeWidth,
            this.strokeFill,
            this.bgFill,
            this.strokeStyle
          );
          break;

        case "diamond":
          this.drawDiamond(
            this.startX,
            this.startY,
            Math.abs(x - this.startX) * 2,
            Math.abs(y - this.startY) * 2,
            this.strokeWidth,
            this.strokeFill,
            this.bgFill,
            this.strokeEdge,
            this.strokeStyle
          );
          break;

        case "line":
          this.drawLine(
            this.startX,
            this.startY,
            x,
            y,
            this.strokeWidth,
            this.strokeFill,
            this.strokeStyle
          );
          break;

        case "pen":
          const currentShape =
            this.existingShape[this.existingShape.length - 1];
          if (currentShape?.type === "pen") {
            currentShape.points.push({ x, y });
            this.drawPencil(
              currentShape.points,
              this.strokeWidth,
              this.strokeFill,
              this.strokeStyle
            );
          }
          break;

        case "eraser":
          this.eraser(x, y);
          break;

        case "grab":
          const { x: transformedX, y: transformedY } = this.transformPanScale(
            e.clientX,
            e.clientY
          );
          const { x: startTransformedX, y: startTransformedY } =
            this.transformPanScale(this.startX, this.startY);

          const deltaX = transformedX - startTransformedX;
          const deltaY = transformedY - startTransformedY;

          this.panX += deltaX * this.scale;
          this.panY += deltaY * this.scale;
          this.startX = e.clientX;
          this.startY = e.clientY;
          this.clearCanvas();
      }
    }
  };

  isPointInShape(x: number, y: number, shape: Shape): boolean {
    const tolerance = ERASER_TOLERANCE;

    switch (shape.type) {
      case "rectangle": {
        const startX = Math.min(shape.x, shape.x + shape.width);
        const endX = Math.max(shape.x, shape.x + shape.width);
        const startY = Math.min(shape.y, shape.y + shape.height);
        const endY = Math.max(shape.y, shape.y + shape.height);

        return (
          x >= startX - tolerance &&
          x <= endX + tolerance &&
          y >= startY - tolerance &&
          y <= endY + tolerance
        );
      }
      case "ellipse": {
        const dx = x - shape.x;
        const dy = y - shape.y;
        const normalized =
          (dx * dx) / ((shape.radX + tolerance) * (shape.radX + tolerance)) +
          (dy * dy) / ((shape.radY + tolerance) * (shape.radY + tolerance));
        return normalized <= 1;
      }
      case "diamond": {
        const dx = Math.abs(x - shape.x);
        const dy = Math.abs(y - shape.y);

        return (
          dx / (shape.width / 2 + tolerance) +
            dy / (shape.height / 2 + tolerance) <=
          1
        );
      }
      case "line": {
        const lineLength = Math.hypot(shape.toX - shape.x, shape.toY - shape.y);
        const distance =
          Math.abs(
            (shape.toY - shape.y) * x -
              (shape.toX - shape.x) * y +
              shape.toX * shape.y -
              shape.toY * shape.x
          ) / lineLength;

        const withinLineBounds =
          x >= Math.min(shape.x, shape.toX) - tolerance &&
          x <= Math.max(shape.x, shape.toX) + tolerance &&
          y >= Math.min(shape.y, shape.toY) - tolerance &&
          y <= Math.max(shape.y, shape.toY) + tolerance;

        return distance <= tolerance && withinLineBounds;
      }
      case "pen": {
        return shape.points.some(
          (point) => Math.hypot(point.x - x, point.y - y) <= tolerance
        );
      }
      default:
        return false;
    }
  }

  transformPanScale(
    clientX: number,
    clientY: number
  ): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left - this.panX) / this.scale;
    const y = (clientY - rect.top - this.panY) / this.scale;
    return { x, y };
  }

  drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    strokeWidth: number,
    strokeFill: string,
    bgFill: string,
    rounded: StrokeEdge,
    strokeStyle: StrokeStyle
  ) {
    const posX = width < 0 ? x + width : x;
    const posY = height < 0 ? y + height : y;
    const normalizedWidth = Math.abs(width);
    const normalizedHeight = Math.abs(height);

    const radius = Math.min(
      Math.abs(
        Math.max(normalizedWidth, normalizedHeight) / RECT_CORNER_RADIUS_FACTOR
      ),
      normalizedWidth / 2,
      normalizedHeight / 2
    );

    this.ctx.beginPath();
    this.ctx.strokeStyle = strokeFill;
    this.ctx.lineWidth = strokeWidth;
    this.ctx.fillStyle = bgFill;

    this.ctx.setLineDash(
      strokeStyle === "dashed"
        ? getDashArrayDashed(strokeWidth)
        : strokeStyle === "dotted"
          ? getDashArrayDotted(strokeWidth)
          : []
    );

    this.ctx.roundRect(
      posX,
      posY,
      normalizedWidth,
      normalizedHeight,
      rounded === "round" ? [radius] : [0]
    );

    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
  }

  drawEllipse(
    x: number,
    y: number,
    width: number,
    height: number,
    strokeWidth: number,
    strokeFill: string,
    bgFill: string,
    strokeStyle: StrokeStyle
  ) {
    this.ctx.beginPath();
    this.ctx.strokeStyle = strokeFill;
    this.ctx.lineWidth = strokeWidth;
    this.ctx.setLineDash(
      strokeStyle === "dashed"
        ? getDashArrayDashed(strokeWidth)
        : strokeStyle === "dotted"
          ? getDashArrayDotted(strokeWidth)
          : []
    );
    this.ctx.fillStyle = bgFill;
    this.ctx.ellipse(x, y, width, height, 0, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.stroke();
  }

  drawDiamond(
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    strokeWidth: number,
    strokeFill: string,
    bgFill: string,
    rounded: StrokeEdge,
    strokeStyle: StrokeStyle
  ) {
    const halfWidth = width / 2;
    const halfHeight = height / 2;

    const normalizedWidth = Math.abs(halfWidth);
    const normalizedHeight = Math.abs(halfHeight);

    this.ctx.setLineDash(
      strokeStyle === "dashed"
        ? getDashArrayDashed(strokeWidth)
        : strokeStyle === "dotted"
          ? getDashArrayDotted(strokeWidth)
          : []
    );

    if (rounded === "round") {
      const cornerRadiusPercentage: number = DIAMOND_CORNER_RADIUS_PERCENTAGE;

      const sideLength = Math.min(
        Math.sqrt(Math.pow(normalizedWidth, 2) + Math.pow(normalizedHeight, 2)),
        2 * normalizedWidth,
        2 * normalizedHeight
      );

      let radius = (sideLength * cornerRadiusPercentage) / 100;

      const maxRadius = Math.min(normalizedWidth, normalizedHeight) * 0.4;
      radius = Math.min(radius, maxRadius);

      const topPoint = { x: centerX, y: centerY - halfHeight };
      const rightPoint = { x: centerX + halfWidth, y: centerY };
      const bottomPoint = { x: centerX, y: centerY + halfHeight };
      const leftPoint = { x: centerX - halfWidth, y: centerY };

      this.ctx.save();

      this.ctx.beginPath();

      const distTopLeft = Math.sqrt(
        Math.pow(topPoint.x - leftPoint.x, 2) +
          Math.pow(topPoint.y - leftPoint.y, 2)
      );

      const startX =
        leftPoint.x + ((topPoint.x - leftPoint.x) * radius) / distTopLeft;
      const startY =
        leftPoint.y + ((topPoint.y - leftPoint.y) * radius) / distTopLeft;

      this.ctx.moveTo(startX, startY);

      this.ctx.arcTo(
        topPoint.x,
        topPoint.y,
        rightPoint.x,
        rightPoint.y,
        radius
      );

      this.ctx.arcTo(
        rightPoint.x,
        rightPoint.y,
        bottomPoint.x,
        bottomPoint.y,
        radius
      );

      this.ctx.arcTo(
        bottomPoint.x,
        bottomPoint.y,
        leftPoint.x,
        leftPoint.y,
        radius
      );

      this.ctx.arcTo(leftPoint.x, leftPoint.y, topPoint.x, topPoint.y, radius);

      this.ctx.lineTo(startX, startY);
      this.ctx.closePath();

      this.ctx.fillStyle = bgFill;
      this.ctx.strokeStyle = strokeFill;
      this.ctx.lineWidth = strokeWidth;

      this.ctx.fill();
      this.ctx.stroke();
    } else {
      this.ctx.beginPath();
      this.ctx.strokeStyle = strokeFill;
      this.ctx.lineWidth = strokeWidth;
      this.ctx.fillStyle = bgFill;

      this.ctx.moveTo(centerX, centerY - halfHeight); // Top point
      this.ctx.lineTo(centerX + halfWidth, centerY); // Right point
      this.ctx.lineTo(centerX, centerY + halfHeight); // Bottom point
      this.ctx.lineTo(centerX - halfWidth, centerY); // Left point
      // Calculate distance between points for the offset calculation
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
    }
  }

  drawLine(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    strokeWidth: number,
    strokeFill: string,
    strokeStyle: StrokeStyle
  ) {
    this.ctx.beginPath();
    this.ctx.strokeStyle = strokeFill;
    this.ctx.lineWidth = strokeWidth;
    this.ctx.setLineDash(
      strokeStyle === "dashed"
        ? getDashArrayDashed(strokeWidth)
        : strokeStyle === "dotted"
          ? getDashArrayDotted(strokeWidth)
          : []
    );
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();

    // arrow
    // const arrowLength = 20;
    // const angle = Math.atan2(toY - fromY, toX - fromX);

    // this.ctx.beginPath();

    // this.ctx.moveTo(toX, toY);
    // this.ctx.lineTo(
    //   toX - arrowLength * Math.cos(angle - Math.PI / 6),
    //   toY - arrowLength * Math.sin(angle - Math.PI / 6)
    // );

    // this.ctx.moveTo(toX, toY);
    // this.ctx.lineTo(
    //   toX - arrowLength * Math.cos(angle + Math.PI / 6),
    //   toY - arrowLength * Math.sin(angle + Math.PI / 6)
    // );

    // this.ctx.stroke();
  }

  drawPencil(
    points: { x: number; y: number }[],
    strokeWidth: number,
    strokeFill: string,
    strokeStyle: StrokeStyle
  ) {
    this.ctx.beginPath();
    this.ctx.strokeStyle = strokeFill;
    this.ctx.lineWidth = strokeWidth;
    this.ctx.setLineDash(
      strokeStyle === "dashed"
        ? getDashArrayDashed(strokeWidth)
        : strokeStyle === "dotted"
          ? getDashArrayDotted(strokeWidth)
          : []
    );
    if (points[0] === undefined) return null;
    this.ctx.moveTo(points[0].x, points[0].y);
    points.forEach((point) => this.ctx.lineTo(point.x, point.y));
    this.ctx.stroke();
  }

  eraser(x: number, y: number) {
    // We don't need to transform the coordinates here again since they're already transformed
    // in the mouseDownHandler and mouseMoveHandler
    const shapeIndex = this.existingShape.findIndex((shape) =>
      this.isPointInShape(x, y, shape)
    );

    if (shapeIndex !== -1) {
      const erasedShape = this.existingShape[shapeIndex];
      this.existingShape.splice(shapeIndex, 1);
      this.clearCanvas();

      if (this.isStandalone) {
        try {
          localStorage.setItem(
            LOCALSTORAGE_CANVAS_KEY,
            JSON.stringify(this.existingShape)
          );
        } catch (e) {
          console.error("Error saving shapes to localStorage:", e);
        }
      } else if (this.sendMessage && this.roomId) {
        this.sendMessage(
          JSON.stringify({
            type: "eraser",
            data: JSON.stringify({
              shape: erasedShape,
            }),
            roomId: this.roomId,
          })
        );
      }
    }
  }

  destroy() {
    this.canvas.removeEventListener("mousedown", this.mouseDownHandler);
    this.canvas.removeEventListener("mousemove", this.mouseMoveHandler);
    this.canvas.removeEventListener("mouseup", this.mouseUpHandler);
    this.canvas.removeEventListener("wheel", this.mouseWheelHandler);
  }

  onScaleChange(scale: number) {
    this.outputScale = scale;
    if (this.onScaleChangeCallback) {
      this.onScaleChangeCallback(scale);
    }
  }

  setScale(newScale: number) {
    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    this.panX -= centerX * (newScale - this.scale);
    this.panY -= centerY * (newScale - this.scale);

    this.scale = newScale;
    this.onScaleChange(this.scale);
    this.clearCanvas();
  }

  clearAllShapes() {
    this.existingShape = [];
    this.clearCanvas();
    if (this.isStandalone) {
      localStorage.removeItem(LOCALSTORAGE_CANVAS_KEY);
    }
  }

  // To resize the canvas width height on screen resize
  handleResize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;

    this.clearCanvas();
  }
}
