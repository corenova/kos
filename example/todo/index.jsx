import React from 'react'
import { render } from 'react-dom'
import TaskList from './TaskList'

const tasks = [
  { id: 1, description: "prepare presentation", done: false },
  { id: 2, description: "drive to codesmith", done: false },
  { id: 3, description: "talk a lot", done: false }
]

const App = () => (
  <TaskList tasks={tasks}/>
)

render(App, document.getElementById('root'))
