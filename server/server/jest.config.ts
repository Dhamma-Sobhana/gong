import type {Config} from '@jest/types';
// Sync object

process.env.TZ = 'Europe/Stockholm';

const config: Config.InitialOptions = {
  verbose: true,
  silent: true,
  transform: {
  '^.+\\.tsx?$': 'ts-jest',
  },
};
export default config;