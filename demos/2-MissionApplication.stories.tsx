import { Toolkit } from '@projectstorm/react-canvas-core';
Toolkit.TESTING = true;

export default {
    title: 'Mission Application'
};

//import mission_pos from './mission-positioning';
//import mission_cal from './mission-calibration';
console.warn('IMPORTING MISSION OVERALL');
import mission_all from './mission-overall';

///export const PositioningExample = mission_pos;
//export const CalibrationExample = mission_cal;
export const OverallMission = mission_all;
