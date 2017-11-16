'use strict'

import React, {Component} from 'react'
import kos, { KineticReact } from 'kos'

import TaskItem from './TaskItem'

const TasksReactor = kos.create('tasks')
  .load(KineticReact)
  
  .in('todo/editable')
  .in('todo/task/selection')
  .out('todo/task/edit','todo/task/toggle')
  .bind(onTaskSelection)

function onTaskSelection(editable, task) {
  if (editable) this.send('todo/task/edit', task)
  else this.send('todo/task/toggle', task)
  this.clear(task)
}

class TaskList extends Component {
  constructor(props) {
    super(props)
    this.reactor = TasksReactor({
      component: this
    })
  }
  render() {
    const { title="My Task List", tasks=[] } = this.props
    const { editable=true } = this.state
    const items = tasks.map(t => (<li><TaskItem task={t}/></li>))
    return (
      <div>
        <h5>{title}</h5>
        <button onClick={this.trigger('todo/editable', !editable) active={editable}}>Edit</button>
        <ol>{items}</ol>
      </div>
    )
  }
}

export default TaskList
export {
  TasksReactor
}
