"use client"

import { useWebSocket } from "@/hooks/useWebSocket";
import { Game } from "@/draw/Game";
import { BgFill, canvasBgLight, Shape, StrokeEdge, StrokeFill, StrokeStyle, StrokeWidth, ToolType } from "@/types/canvas";
import { useCallback, useEffect, useRef, useState } from "react";
import { Scale } from "../Scale";
import { MobileNavbar } from "../mobile-navbar";
import { useTheme } from "next-themes";
import { MainMenuStack } from "../MainMenuStack";
import { ToolMenuStack } from "../ToolMenuStack";
import SidebarTriggerButton from "../SidebarTriggerButton";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import Toolbar from "../Toolbar";
import ScreenLoading from "../ScreenLoading";
import CollaborationStart from "../CollaborationStartBtn";
import { cn } from "@/lib/utils";

export function CanvasSheet({ roomName, roomId, userId, userName, token }: { roomName: string; roomId: string; userId: string; userName: string; token: string }) {
    const { theme } = useTheme()
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [game, setGame] = useState<Game>();
    const [scale, setScale] = useState<number>(1);
    const [activeTool, setActiveTool] = useState<ToolType>("grab");
    const [strokeFill, setStrokeFill] = useState<StrokeFill>("#f08c00");
    const [strokeWidth, setStrokeWidth] = useState<StrokeWidth>(1);
    const [bgFill, setBgFill] = useState<BgFill>("#00000000");
    const [strokeEdge, setStrokeEdge] = useState<StrokeEdge>("round");
    const [strokeStyle, setStrokeStyle] = useState<StrokeStyle>("solid");
    const [grabbing, setGrabbing] = useState(false);
    const [existingShapes, setExistingShapes] = useState<Shape[]>([]);
    const paramsRef = useRef({ roomId, roomName, userId, userName });
    const activeToolRef = useRef(activeTool);
    const strokeFillRef = useRef(strokeFill);
    const strokeWidthRef = useRef(strokeWidth);
    const strokeEdgeRef = useRef(strokeEdge);
    const strokeStyleRef = useRef(strokeStyle);
    const bgFillRef = useRef(bgFill);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [canvasColor, setCanvasColor] = useState<string>(canvasBgLight[0]);
    const canvasColorRef = useRef(canvasColor);

    const { isConnected, messages, participants, sendDrawingData } = useWebSocket(
        roomId,
        roomName,
        userId,
        userName,
        token
    );

    const { matches, isLoading } = useMediaQuery('md');

    useEffect(() => {
        setCanvasColor(canvasBgLight[0]);
    }, [theme])

    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current && game) {
                const canvas = canvasRef.current;
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                game.handleResize(window.innerWidth, window.innerHeight);
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [game]);

    useEffect(() => {
        paramsRef.current = { roomId, roomName, userId, userName };
    }, [roomId, roomName, userId, userName]);

    useEffect(() => {
        if (messages.length > 0) {
            try {
                messages.forEach((message) => {
                    try {
                        const data = JSON.parse(message.message);
                        console.log('ws msg data = ', data)
                        if (data.type === "draw") {
                            const shape = JSON.parse(data.data).shape;
                            setExistingShapes((prevShapes) => [...prevShapes, shape]);
                        } else if (data.type === "eraser") {
                            const shape = JSON.parse(data.data).shape;
                            setExistingShapes((prevShapes) =>
                                prevShapes.filter((s) => JSON.stringify(s) !== JSON.stringify(shape))
                            );
                        }
                    } catch (e) {
                        console.error("Error processing message:", e);
                    }
                });
            } catch (e) {
                console.error("Error processing messages:", e);
            }
        }
    }, [messages]);

    useEffect(() => {
        game?.setTool(activeTool)
        game?.setStrokeWidth(strokeWidth)
        game?.setStrokeFill(strokeFill)
        game?.setBgFill(bgFill)
        game?.setCanvasBgColor(canvasColor)
        game?.setStrokeEdge(strokeEdge)
    });

    useEffect(() => {
        strokeEdgeRef.current = strokeEdge;
        game?.setStrokeEdge(strokeEdge);
    }, [strokeEdge, game]);

    useEffect(() => {
        strokeStyleRef.current = strokeStyle;
        game?.setStrokeStyle(strokeStyle);
    }, [strokeStyle, game]);

    useEffect(() => {
        activeToolRef.current = activeTool;
        game?.setTool(activeTool);
    }, [activeTool, game]);

    useEffect(() => {
        strokeWidthRef.current = strokeWidth;
        game?.setStrokeWidth(strokeWidth);
    }, [strokeWidth, game]);

    useEffect(() => {
        strokeFillRef.current = strokeFill;
        game?.setStrokeFill(strokeFill);
    }, [strokeFill, game]);

    useEffect(() => {
        bgFillRef.current = bgFill;
        game?.setBgFill(bgFill);
    }, [bgFill, game]);

    useEffect(() => {
        if (game && existingShapes.length >= 0) {
            game.updateShapes(existingShapes);
        }
    }, [game, existingShapes]);

    useEffect(() => {
        if (game && canvasColorRef.current !== canvasColor) {
            canvasColorRef.current = canvasColor;
            game.setCanvasBgColor(canvasColor);
        }
    }, [canvasColor, game]);

    useEffect(() => {
        if (game) {
            game.setScale(scale);
        }
    }, [scale, game]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case "1":
                    setActiveTool("grab");
                    break;
                case "2":
                    setActiveTool("rectangle");
                    break;
                case "3":
                    setActiveTool("ellipse");
                    break;
                case "4":
                    setActiveTool("diamond");
                    break;
                case "5":
                    setActiveTool("line");
                    break;
                case "6":
                    setActiveTool("pen");
                    break;
                case "7":
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

    const handleSendDrawing = useCallback((drawingData: string) => {
        if (isConnected) {
            sendDrawingData(JSON.stringify(drawingData));

        }
    }, [isConnected, sendDrawingData]);

    // const handleEraserComplete = useCallback((eraserData: string) => {
    //     if (isConnected) {
    //         sendEraserData(JSON.stringify(eraserData));

    //     }
    // }, [isConnected, sendEraserData]);

    useEffect(() => {
        try {
            console.log('participants = ', participants)
        } catch (e) {
            console.error("Error processing messages:", e);
        }
    }, [participants]);

    useEffect(() => {
        if (canvasRef.current) {
            const game = new Game(
                canvasRef.current,
                paramsRef.current.roomId,
                canvasColorRef.current,
                handleSendDrawing,
                paramsRef.current.roomName,
                (newScale) => setScale(newScale),
                []
            )
            setGame(game);

            game.setTool(activeToolRef.current);
            game.setStrokeWidth(strokeWidthRef.current);
            game.setStrokeFill(strokeFillRef.current);
            game.setBgFill(bgFillRef.current);
            game.setStrokeEdge(strokeEdgeRef.current);

            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;

            return () => {
                game.destroy();
            }
        }

    }, [canvasRef, handleSendDrawing]);

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
        if (game?.outputScale) {
            setScale(game.outputScale);
        }
    }, [game?.outputScale]);

    const toggleSidebar = useCallback(() => {
        setSidebarOpen(prev => !prev);
    }, []);

    if (isLoading) {
        return (
            <ScreenLoading />
        )
    }

    return (
        <div className={cn("collabydraw h-screen overflow-hidden",
            activeTool === "eraser"
                ? "cursor-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAOBJREFUOE9jZKAyYKSyeQzDwMD////7MDAw6EGD5hIjI+MWfMGE08sggz5+/Dj71q1bHPv27eMFGeLk5PRZTU3tBz8/fyoug7EaCDLs58+fa0NDQ9k2b96M4iBfX1+G1atX/2JnZw/GZihWAz98+PA8NjZWAt0wmMkgQxcvXvxCQEBAEt37GAaCXHf69OnFZmZmAvjC6tSpUx9MTU1j0V2JzcCqzs7OpoqKCmZ8BnZ0dPwtLy+vY2RkbENWRxcDqetlkPOpGikgA6mebGCGUi1hI8ca1bIeucXaMCi+SPU6AHRTjhWg+vuGAAAAAElFTkSuQmCC')_10_10,auto]"
                : activeTool === "grab" && !sidebarOpen
                    ? grabbing ? "cursor-grabbing" : "cursor-grab"
                    : "cursor-crosshair")}>
            <div className="App_Menu App_Menu_Top fixed z-[4] top-4 right-4 left-4 flex justify-center items-center md:grid md:grid-cols-[1fr_auto_1fr] md:gap-8 md:items-start">
                {matches && (
                    <div className="Main_Menu_Stack Sidebar_Trigger_Button md:grid md:gap-[calc(.25rem*6)] grid-cols-[auto] grid-flow-row grid-rows auto-rows-min justify-self-start">
                        <div className="relative">
                            <SidebarTriggerButton onClick={toggleSidebar} />

                            {sidebarOpen && (
                                <MainMenuStack
                                    isOpen={sidebarOpen}
                                    onClose={() => setSidebarOpen(false)}
                                    canvasColor={canvasColor}
                                    setCanvasColor={setCanvasColor}
                                    roomName={roomName}
                                />
                            )}
                        </div>

                        <ToolMenuStack activeTool={activeTool}
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
                <Toolbar
                    selectedTool={activeTool}
                    onToolSelect={setActiveTool}
                />
                {matches && (
                    <CollaborationStart participants={participants} slug={roomName} />
                )}
            </div>

            {matches && (
                <Scale scale={scale} setScale={setScale} />
            )}

            {!matches && (
                <MobileNavbar
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

                    roomName={roomName}
                />
            )}
            <canvas className={cn("collabydraw collabydraw-canvas", theme === 'dark' ? 'collabydraw-canvas-dark' : '')} ref={canvasRef} />
        </div >
    )
}