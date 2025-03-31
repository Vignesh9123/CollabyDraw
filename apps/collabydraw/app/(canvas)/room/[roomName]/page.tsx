import client from '@repo/db/client';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/utils/auth';
import CanvasSheet from '@/components/canvas/CanvasSheet';

export default async function CanvasPage({ params }: { params: Promise<{ roomName: string }> }) {
    const resolvedParams = params instanceof Promise ? await params : params;
    const paramsRoomName = resolvedParams.roomName;
    const decodedParam = decodeURIComponent(paramsRoomName)

    const room = await client.room.findFirst({
        where: { id: decodedParam },
    });
    if (!room) {
        notFound();
    }

    const session = await getServerSession(authOptions);
    const user = session?.user;
    if (!user || !user.id) {
        console.error('User from session not found.');
        redirect('/auth/signin?callbackUrl=' + encodeURIComponent(`/room/${decodedParam}`));
    }

    return (
        <CanvasSheet
            roomId={room.id.toString()}
            roomName={room.id}
            userId={user.id}
            userName={user.name || 'User-' + user.id}
            token={session.accessToken}
        />
    )
}