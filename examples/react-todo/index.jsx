import React from 'react'
import { render } from 'react-dom'
import { AddTodo, TodoList, Footer } from './Components'
import TodoFlow from './TodoFlow'

const App = () => (
  <TodoFlow>
    <AddTodo />
    <TodoList />
    <Footer />
  </TodoFlow>
)

render(App, document.getElementById('root'))
