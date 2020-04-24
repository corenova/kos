import { storiesOf, addDecorator } from '@storybook/react';
import { Toolkit } from '@projectstorm/react-canvas-core';

Toolkit.TESTING = true;

addDecorator(demo => {
    Toolkit.TESTING_UID = 0;
    return demo();
});

import demo_simple from './demo-simple';
import demo_flow from './demo-simple-flow';
import demo_performance from './demo-performance';
import demo_locks from './demo-locks';
import demo_grid from './demo-grid';
import demo_listeners from './demo-listeners';
import demo_zoom from './demo-zoom-to-fit';
import demo_labels from './demo-labelled-links';
import demo_dynamic_ports from './demo-dynamic-ports';
import demo_alternative_linking from './demo-alternative-linking';
import demo_custom_delete_keys from './demo-custom_delete_keys';
import demo_custom_action from './demo-custom-action';

storiesOf('Simple Usage', module)
    .add('Simple example', demo_simple)
    .add('Simple flow example', demo_flow)
    .add('Performance demo', demo_performance)
    .add('Locked widget', demo_locks)
    .add('Canvas grid size', demo_grid)
    .add('Events and listeners', demo_listeners)
    .add('Zoom to fit', demo_zoom)
    .add('Dynamic ports', demo_dynamic_ports)
    .add('Links with labels', demo_labels);

import demo_adv_clone_selected from './demo-cloning';
import demo_adv_ser_des from './demo-serializing';
import demo_adv_prog from './demo-mutate-graph';
import demo_adv_dnd from './demo-drag-and-drop';
import demo_smart_routing from './demo-smart-routing';
import demo_right_angles_routing from './demo-right-angles-routing';

storiesOf('Advanced Techniques', module)
    .add('Clone Selected', demo_adv_clone_selected)
    .add('Serializing and de-serializing', demo_adv_ser_des)
    .add('Programatically modifying graph', demo_adv_prog)
    .add('Drag and drop', demo_adv_dnd)
    .add('Smart routing', demo_smart_routing)
    .add('Right angles routing', demo_right_angles_routing)
    .add('Linking by clicking instead of dragging', demo_alternative_linking)
    .add('Setting custom delete keys', demo_custom_delete_keys);

import demo_cust_nodes from './demo-custom-node1';
import demo_cust_links from './demo-custom-link1';
import demo_cust_links2 from './demo-custom-link2';

storiesOf('Customization', module)
    .add('Custom diamond node', demo_cust_nodes)
    .add('Custom animated links', demo_cust_links)
    .add('Custom link ends (arrows)', demo_cust_links2)
    .add('Custom event', demo_custom_action);

import demo_3rd_dagre from './demo-dagre';
import demo_gsap from './demo-animation';

storiesOf('3rd party libraries', module)
    .add('Auto Distribute (Dagre)', demo_3rd_dagre)
    .add('Animated node moves (GSAP)', demo_gsap);
