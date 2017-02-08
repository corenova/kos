import React from 'react'

import TodoFlow from './TodoFlow'

export const Todo = ({ completed, text, onClick }) => (
  <li onClick={onClick} style={{ textDecoration: completed ? 'line-through': 'none' }}>
  {text}
  </li>
)

export const TodoList = ({ todos=[], onTodoClick }) => (
  <ul>
    {todos.map(todo => {
      return <Todo key={todo.id} {...todo} onClick={() => onTodoClick(todo.id)}/>
    })}
  </ul>
)

export const Link = ({ active, children, onClick }) => {
  if (active) return (<span>{children}</span>)
  return (
    <a href="#" onClick={onClick}>
      {children}
    </a>
  )
}

export const Footer = () => (
  <p>
    Show:
    {" "}<FilterLink filter="SHOW_ALL">All</FilterLink>
    {", "}<FilterLink filter="SHOW_ACTIVE">Active</FilterLink>
    {", "}<FilterLink filter="SHOW_COMPLETED">Completed</FilterLink>
  </p>
)

export const FilterLink = props => (<Link>{props.children}</Link>)

export const AddTodo = ({ onSubmit }) => {
  let input

  return (
    <div>
      <form onSubmit={e => {
        e.preventDefault()
        onSubmit(input.value)
        input.value = ''
      }}>
      <input ref={x => { input = x }}/>
      <button type="submit">
        Add Todo
      </button>
      </form>
    </div>
  )
}

