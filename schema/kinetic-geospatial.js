'use strict';

require('yang-js');

const MovementTracker = {

  localize(pos) {
    const Haversine = this.use('haversine');
    const { origin } = this.state;
    if (!origin || !origin.gps) {
      this.state.merge({ origin: { gps: pos } });
      return;
    }
    const { gps, ned } = origin;
    const [ x, y ] = Haversine.getPosition(
      { lat: gps.latitude,
	lng: gps.longitude },
      { lat: pos.latitude,
	lng: pos.longitude }
    );
    const z = pos.altitude - gps.altitude;
    this.send('ned-position', {
      x: ned.x + x,
      y: ned.y + y,
      z: ned.z - z,
    });
  }

}

module.exports = require('./kinetic-geospatial.yang').bind({

  'feature(haversine)': require('haversine-position').Haversine,
  // interfaces
  MovementTracker
});
