import { registerRoot, Composition, AbsoluteFill } from 'remotion';
import { Reel } from './Reel.jsx';
import { Narrator } from './Narrator.jsx';
import timeline from './timeline.json';

// Close-up turntable of the mascot for checking the drawing and lip-sync.
const Mascot = () => (
  <AbsoluteFill style={{ background: 'radial-gradient(#2a2050, #07060f)' }}>
    <div style={{ position: 'absolute', left: 300, top: 260, transform: 'scale(2.2)', transformOrigin: '0 0', width: 440, height: 660 }}>
      <Narrator mouth={timeline.scenes[0].mouth} voiceFrom={0} side="left" enter="jump" />
    </div>
  </AbsoluteFill>
);

const Root = () => (
  <>
    <Composition id="Reel" component={Reel} durationInFrames={timeline.total} fps={timeline.fps} width={1080} height={1920} />
    <Composition id="Mascot" component={Mascot} durationInFrames={120} fps={30} width={1080} height={1920} />
  </>
);

registerRoot(Root);
