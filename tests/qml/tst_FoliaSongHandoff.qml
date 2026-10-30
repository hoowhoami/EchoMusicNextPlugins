import QtQuick
import QtTest

TestCase {
    name: "FoliaSongHandoff"
    when: windowShown
    function test_realPlayerOwnsTheTypedReadonlyTransition() {
        const player = foliaTestPlugin.player;
        verify('transition' in player, 'The real SDK player has no native transition projection');
        const transition = player.transition;
        verify(transition !== null);
        compare(transition.valid, false, 'No queued mixed PCM must not invent an incoming song');
        verify(transition.outgoing !== null && transition.incoming !== null);
        compare(transition.incoming.lyrics.rowCount(), 0);
        verify(!('play' in transition.incoming));
        verify(!('seek' in transition.incoming));
        verify(!('queue' in transition.incoming));
    }
}
