'use client'

import { Button } from "./ui/button";
import { Copy, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { toast } from "sonner";
import { deleteRoom } from "@/actions/room";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function RoomSharingDialog({ open, onOpenChange, link }: { open: boolean, onOpenChange: (open: boolean) => void, link: string }) {
    const roomLink = link;
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const copyRoomLink = async () => {
        try {
            await navigator.clipboard.writeText(roomLink);
            toast.success('Link copied to clipboard!');
        } catch (error) {
            toast.error('Failed to copy link');
            console.error('Failed to copy link:', error);
        }
    };

    const stopSession = () => {
        startTransition(async () => {
            try {
                if (!roomLink) {
                    toast.error("Invalid room link.");
                    return;
                }

                const roomName = roomLink.split('/').pop();
                if (!roomName) {
                    toast.error("Room name is missing from the link.");
                    return;
                }

                const response = await deleteRoom({ roomName });

                if (response.success) {
                    toast.success("Room session ended successfully!");
                    onOpenChange(false);
                    router.push('/');
                } else {
                    toast.error(response.error || "Failed to delete the room.");
                }
            } catch (error) {
                toast.error('Failed to end session');
                console.error('Failed to end session:', error);
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass-panel gap-6 max-w-lg bg-island-bg-color border border-dialog-border-color shadow-modal-shadow rounded-lg p-10" overlayClassName="bg-[#12121233]">
                <DialogHeader className="gap-6">
                    <DialogTitle className="flex items-center justify-center w-full font-bold text-xl text-color-primary tracking-[0.75px]">Live collaboration</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    <div className="text-text-primary-color">
                        <p className="font-semibold mb-2">Link</p>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-collaby-textfield border border-collaby-textfield rounded-md px-3 py-2 text-text-primary-color overflow-hidden text-ellipsis">
                                {roomLink}
                            </div>
                            <Button
                                onClick={copyRoomLink}
                                className="py-2 px-6 rounded-md text-[.875rem] font-semibold shadow-none bg-color-primary hover:bg-brand-hover active:bg-brand-active active:scale-[.98]"
                                title="Copy link"
                                size={"lg"}
                            >
                                <Copy className="w-5 h-5" /> Copy Link
                            </Button>
                        </div>
                    </div>

                    <div className="text-text-primary-color text-[.875rem] leading-[150%] font-normal">
                        <div className="flex items-center mb-4">
                            <span className="mr-2">🔒</span>
                            Don&apos;t worry, the session is end-to-end encrypted, and fully private. Not even our server can see what you draw.
                        </div>

                        <div className="mt-4">
                            Stopping the session will disconnect you from the room, but you&apos;ll be able to continue working with the scene, locally. Note that this won&apos;t affect other people, and they&apos;ll still be able to collaborate on their version.
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex items-center justify-center sm:justify-center">
                    <Button
                        onClick={stopSession}
                        className="py-2 px-6 min-h-12 rounded-md text-[.875rem] font-semibold shadow-none bg-red-500 hover:bg-red-600 active:bg-red-700 active:scale-[.98] text-white"
                        disabled={isPending}
                    >
                        <X className="w-5 h-5 mr-2" />
                        {isPending ? 'Destroying...' : 'Stop session'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}