import { registerRoot, Composition } from 'remotion';
import { Reel } from './Reel.jsx';
import timeline from './timeline.json';

const Root = () => (
  <Composition
    id="Reel"
    component={Reel}
    durationInFrames={timeline.total}
    fps={timeline.fps}
    width={1080}
    height={1920}
  />
);

registerRoot(Root);
