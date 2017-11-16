'use strict'

import React, {Component} from 'react'
import kos, { KineticReact } from 'kos'

const TaskItemReactor = kos.create('task-item')
  .load(KineticReact)

  .in('todo/task/edit')
  .out('todo/task')
  .bind(onTaskEdit)

  .in('todo/task/toggle')
  .out('todo/task')
  .bind(onTaskToggle)

function onTaskEdit(task) {
  const myTask = this.get('task')
  if (myTask.id === task.id) {
    this.save({ editing: true })
  }
}

function onTaskToggle(task) {
  const myTask = this.get('task')
  if (myTask.id === task.id) {
    task.done = !task.done
    this.save({ task })
    this.send('todo/task', task)
  }
}

class TaskItem extends Component {
  constructor(props) {
    super(props)
    this.reactor = TaskItemReactor({
      component: this,
      task: props.task
    })
  }
  render() {
    const { task } = this.state
    const { description, done } = task
    return (
      <span className={done && 'complete'}>{description}</span>
    )
  }
}
