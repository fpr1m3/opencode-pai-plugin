export async function notifyVoiceServer(message: string) {
    try {
        await fetch('http://localhost:8888/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
        });
    } catch (error) {
        // Ignore errors if server is not running
    }
}
