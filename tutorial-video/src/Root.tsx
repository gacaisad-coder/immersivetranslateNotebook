import {Composition} from 'remotion';
import type {FC} from 'react';
import {TutorialVideo} from './TutorialVideo';

export const Root: FC = () => {
  return (
    <Composition
      id="ImmersiveTranslateTutorial"
      component={TutorialVideo}
      durationInFrames={840}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
