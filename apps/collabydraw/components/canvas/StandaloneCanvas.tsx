"use client"

import { CanvasEngine } from "@/canvas-engine/CanvasEngine";
import { BgFill, canvasBgLight, LOCALSTORAGE_CANVAS_KEY, Shape, StrokeEdge, StrokeFill, StrokeStyle, StrokeWidth, ToolType } from "@/types/canvas";
import { useCallback, useEffect, useRef, useState } from "react";
import { MobileCommandBar } from "../MobileCommandBar";
import { useTheme } from "next-themes";
import { HomeWelcome, MainMenuWelcome, ToolMenuWelcome } from "../welcome-screen";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import ScreenLoading from "../ScreenLoading";
import CollaborationToolbar from "../CollaborationToolbar";
import { cn } from "@/lib/utils";
import UserRoomsList from "../UserRoomsList";
import { useSession } from "next-auth/react";
import AppMenuButton from "../AppMenuButton";
import { AppSidebar } from "../AppSidebar";
import { StyleConfigurator } from "../StyleConfigurator";
import ToolSelector from "../ToolSelector";
import ZoomControl from "../ZoomControl";

export function StandaloneCanvas() {
    const { theme } = useTheme()
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [engine, setCanvasEngine] = useState<CanvasEngine>();
    const [scale, setScale] = useState<number>(1);
    const [activeTool, setActiveTool] = useState<ToolType>("grab");
    const [strokeFill, setStrokeFill] = useState<StrokeFill>("#f08c00");
    const [strokeWidth, setStrokeWidth] = useState<StrokeWidth>(1);
    const [bgFill, setBgFill] = useState<BgFill>("#00000000");
    const [strokeEdge, setStrokeEdge] = useState<StrokeEdge>("round");
    const [strokeStyle, setStrokeStyle] = useState<StrokeStyle>("solid");
    const [grabbing, setGrabbing] = useState(false);
    const [existingShapes, setExistingShapes] = useState<Shape[]>([]);
    const activeToolRef = useRef(activeTool);
    const strokeFillRef = useRef(strokeFill);
    const strokeWidthRef = useRef(strokeWidth);
    const strokeEdgeRef = useRef(strokeEdge);
    const strokeStyleRef = useRef(strokeStyle);
    const bgFillRef = useRef(bgFill);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [canvasColor, setCanvasColor] = useState<string>(canvasBgLight[0]);
    const canvasColorRef = useRef(canvasColor);
    const [isCanvasEmpty, setIsCanvasEmpty] = useState(true);
    const { data: session } = useSession();

    const { matches, isLoading } = useMediaQuery("md");

    useEffect(() => {
        const storedShapes = localStorage.getItem(LOCALSTORAGE_CANVAS_KEY);
        if (storedShapes) {
            const parsedShapes = JSON.parse(storedShapes);
            setIsCanvasEmpty(parsedShapes.length === 0);
            setExistingShapes(parsedShapes);
        } else {
            setIsCanvasEmpty(true);
        }
    }, []);

    useEffect(() => {
        setIsCanvasEmpty(existingShapes.length === 0);
    }, [existingShapes, activeTool]);

    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current && engine) {
                const canvas = canvasRef.current;
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                engine.handleResize(window.innerWidth, window.innerHeight);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [engine]);

    useEffect(() => {
        if (existingShapes.length > 0) {
            localStorage.setItem(LOCALSTORAGE_CANVAS_KEY, JSON.stringify(existingShapes));
        }
    }, [existingShapes]);

    const clearCanvas = useCallback(() => {
        engine?.clearAllShapes();
        setExistingShapes([]);
        localStorage.removeItem(LOCALSTORAGE_CANVAS_KEY);
    }, [engine]);

    useEffect(() => {
        setCanvasColor(canvasBgLight[0]);
    }, [theme])

    useEffect(() => {
        engine?.setTool(activeTool)
        engine?.setStrokeWidth(strokeWidth)
        engine?.setStrokeFill(strokeFill)
        engine?.setBgFill(bgFill)
        engine?.setCanvasBgColor(canvasColor)
        engine?.setStrokeEdge(strokeEdge)
        engine?.setStrokeStyle(strokeStyle)
    });

    useEffect(() => {
        strokeEdgeRef.current = strokeEdge;
        engine?.setStrokeEdge(strokeEdge);
    }, [strokeEdge, engine]);

    useEffect(() => {
        strokeStyleRef.current = strokeStyle;
        engine?.setStrokeStyle(strokeStyle);
    }, [strokeStyle, engine]);

    useEffect(() => {
        activeToolRef.current = activeTool;
        engine?.setTool(activeTool);
    }, [activeTool, engine]);

    useEffect(() => {
        strokeWidthRef.current = strokeWidth;
        engine?.setStrokeWidth(strokeWidth);
    }, [strokeWidth, engine]);

    useEffect(() => {
        strokeFillRef.current = strokeFill;
        engine?.setStrokeFill(strokeFill);
    }, [strokeFill, engine]);

    useEffect(() => {
        bgFillRef.current = bgFill;
        engine?.setBgFill(bgFill);
    }, [bgFill, engine]);

    useEffect(() => {
        if (engine && existingShapes.length >= 0) {
            engine.updateShapes(existingShapes);
        }
    }, [engine, existingShapes]);

    useEffect(() => {
        if (engine && canvasColorRef.current !== canvasColor) {
            canvasColorRef.current = canvasColor;
            engine.setCanvasBgColor(canvasColor);
        }
    }, [canvasColor, engine]);

    useEffect(() => {
        if (engine) {
            engine.setScale(scale);
        }
    }, [scale, engine]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case "1":
                    setActiveTool("selection");
                    break;
                case "2":
                    setActiveTool("grab");
                    break;
                case "3":
                    setActiveTool("rectangle");
                    break;
                case "4":
                    setActiveTool("ellipse");
                    break;
                case "5":
                    setActiveTool("diamond");
                    break;
                case "6":
                    setActiveTool("line");
                    break;
                case "7":
                    setActiveTool("pen");
                    break;
                case "8":
                    setActiveTool("arrow");
                    break;
                case "9":
                    setActiveTool("eraser");
                    break;
                default:
                    break;
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [setActiveTool]);

    useEffect(() => {
        if (canvasRef.current) {
            const engine = new CanvasEngine(
                canvasRef.current,
                null,
                null,
                null,
                null,
                null,
                canvasColorRef.current,
                (newScale) => setScale(newScale),
                true,
            )
            setCanvasEngine(engine);

            engine.setTool(activeToolRef.current);
            engine.setStrokeWidth(strokeWidthRef.current);
            engine.setStrokeFill(strokeFillRef.current);
            engine.setBgFill(bgFillRef.current);
            engine.setStrokeEdge(strokeEdgeRef.current);
            engine.setStrokeStyle(strokeStyleRef.current);

            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;

            return () => {
                engine.destroy();
            }
        }
    }, [canvasRef]);

    useEffect(() => {
        if (activeTool === "grab") {
            const handleGrab = () => {
                setGrabbing((prev) => !prev)
            }

            document.addEventListener("mousedown", handleGrab)
            document.addEventListener("mouseup", handleGrab)

            return () => {
                document.removeEventListener("mousedown", handleGrab)
                document.removeEventListener("mouseup", handleGrab)
            }
        }
    }, [activeTool]);

    useEffect(() => {
        if (engine?.outputScale) {
            setScale(engine.outputScale);
        }
    }, [engine?.outputScale]);

    const toggleSidebar = useCallback(() => {
        setSidebarOpen(prev => !prev);
    }, []);

    const exportCanvas = useCallback(() => {
        const dataStr = JSON.stringify(existingShapes);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = 'canvas-drawing.json';

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }, [existingShapes]);

    const importCanvas = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';

        input.onchange = (e: Event) => {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const shapes = JSON.parse(event.target?.result as string);
                        setExistingShapes(shapes);

                        localStorage.setItem(LOCALSTORAGE_CANVAS_KEY, JSON.stringify(shapes));

                        if (engine) {
                            engine.updateShapes(shapes);
                        }
                    } catch (err) {
                        console.error('Failed to parse JSON file', err);
                        alert('Failed to load the drawing. The file might be corrupted.');
                    }
                };
                reader.readAsText(file);
            }
        };

        input.click();
    }, [engine]);

    const handleToolSelect = (tool: ToolType) => {
        setActiveTool(tool);
        engine?.setTool(tool);
        console.log('existingShapes = ', existingShapes)
        if (tool !== "selection") {
            engine?.updateShapes(existingShapes);
        }
    };

    return (
        <div className={cn("collabydraw h-screen overflow-hidden",
            activeTool === "eraser"
                ? "cursor-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAOBJREFUOE9jZKAyYKSyeQzDwMD////7MDAw6EGD5hIjI+MWfMGE08sggz5+/Dj71q1bHPv27eMFGeLk5PRZTU3tBz8/fyoug7EaCDLs58+fa0NDQ9k2b96M4iBfX1+G1atX/2JnZw/GZihWAz98+PA8NjZWAt0wmMkgQxcvXvxCQEBAEt37GAaCXHf69OnFZmZmAvjC6tSpUx9MTU1j0V2JzcCqzs7OpoqKCmZ8BnZ0dPwtLy+vY2RkbENWRxcDqetlkPOpGikgA6mebGCGUi1hI8ca1bIeucXaMCi+SPU6AHRTjhWg+vuGAAAAAElFTkSuQmCC')_10_10,auto]"
                : activeTool === "grab" && !sidebarOpen
                    ? grabbing ? "cursor-grabbing" : "cursor-grab"
                    : "cursor-crosshair")}>

            {!isLoading && (
                <div className="App_Menu App_Menu_Top fixed z-[4] top-4 right-4 left-4 flex justify-center items-center md:grid md:grid-cols-[1fr_auto_1fr] md:gap-8 md:items-start">
                    {matches && !isLoading && (
                        <div className="Main_Menu_Stack Sidebar_Trigger_Button md:grid md:gap-[calc(.25rem*6)] grid-cols-[auto] grid-flow-row grid-rows auto-rows-min justify-self-start">
                            <div className="relative">
                                <AppMenuButton onClick={toggleSidebar} />

                                {sidebarOpen && (
                                    <AppSidebar
                                        isOpen={sidebarOpen}
                                        onClose={() => setSidebarOpen(false)}
                                        canvasColor={canvasColor}
                                        setCanvasColor={setCanvasColor}
                                        isStandalone={true}
                                        onClearCanvas={clearCanvas}
                                        onExportCanvas={exportCanvas}
                                        onImportCanvas={importCanvas}
                                    />
                                )}

                                {activeTool === "grab" && isCanvasEmpty && (
                                    <MainMenuWelcome />
                                )}
                            </div>

                            <StyleConfigurator activeTool={activeTool}
                                strokeFill={strokeFill}
                                setStrokeFill={setStrokeFill}
                                strokeWidth={strokeWidth}
                                setStrokeWidth={setStrokeWidth}
                                bgFill={bgFill}
                                setBgFill={setBgFill}
                                strokeEdge={strokeEdge}
                                setStrokeEdge={setStrokeEdge}
                                strokeStyle={strokeStyle}
                                setStrokeStyle={setStrokeStyle}
                            />
                        </div>
                    )}

                    <ToolSelector
                        selectedTool={activeTool}
                        onToolSelect={handleToolSelect}
                    />
                    {!isLoading && matches && (
                        <CollaborationToolbar />
                    )}
                </div>
            )}
            {activeTool === "grab" && isCanvasEmpty && !isLoading && (
                <div className="relative">
                    <ToolMenuWelcome />
                </div>
            )}

            {!isLoading && matches && (
                <ZoomControl scale={scale} setScale={setScale} />
            )}

            {!isLoading && matches && session?.user && (
                <UserRoomsList />
            )}

            {!isLoading && !matches && (
                <MobileCommandBar
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                    canvasColor={canvasColor}
                    setCanvasColor={setCanvasColor}
                    scale={scale}
                    setScale={setScale}

                    activeTool={activeTool}
                    strokeFill={strokeFill}
                    setStrokeFill={setStrokeFill}
                    strokeWidth={strokeWidth}
                    setStrokeWidth={setStrokeWidth}
                    bgFill={bgFill}
                    setBgFill={setBgFill}

                    strokeEdge={strokeEdge}
                    setStrokeEdge={setStrokeEdge}
                    strokeStyle={strokeStyle}
                    setStrokeStyle={setStrokeStyle}

                    isStandalone={true}
                    onClearCanvas={clearCanvas}
                    onExportCanvas={exportCanvas}
                    onImportCanvas={importCanvas}
                />
            )}

            {!isLoading && activeTool === "grab" && isCanvasEmpty && (
                <HomeWelcome />
            )}

            {isLoading && (
                <ScreenLoading />
            )}

            <canvas className={cn("collabydraw collabydraw-canvas", theme === 'dark' ? 'collabydraw-canvas-dark' : '')} ref={canvasRef} />

        </div >
    )
}