import React, { Component, Children } from 'react'
import { FilterLink, AddTodo, TodoList } from './Components'

const kos = require('kos')
const ReactFlow = require('kos/flows/react')

export default class TodoFlow extends Component {
  constructor(props) {
    super(props)
    this.state = {
      flow: new Flow
    }
    this.state.flow
      .feed('module/react', React)
      .feed('react/components', [ FilterLink, AddTodo, TodoList ])
      .on('app/todos/filtered', todos => this.setState({ todos: todos }))
  }
  render() {
    return Children.only(this.props.children)
  }
}

export const Flow = kos.flow
  .label('kos-react-todo')
  .use(ReactFlow)
   // react component specific event handler
  .in(FilterLink).out('app/filter').with({ filter: 'SHOW_ALL' }).bind(onFilterLink)
  .in(AddTodo).out('app/todo').bind(onAddTodo)
  .in(TodoList,'app/todos/filtered').out('app/todo/toggle').bind(onTodoList)

  // main application flow
  .in('app/todo').out('app/todos').with({ todos: new Set() }).bind(updateTodoList)
  .in('app/todos','app/filter').out('app/todos/filtered').bind(filterTodoList)
  .in('app/todos','app/todo/toggle').out('app/todo').bind(toggleTodo)

//
// Flow Actions
//
function onFilterLink({ key }) {
  let handler = this.pull(key)
  handler.wrap = props => ({
    active: props.filter === this.get('filter'),
    onClick: (e) => {
      if (props.filter !== this.get('filter')) {
        this.set('filter', props.filter)
        this.send('app/filter', props.filter)
      }
    }
  })
}

function onAddTodo({ value }) {
  let handler = value
  handler.wrap = props => ({
    onSubmit: (text) => {
      e.preventDefault()
      this.send('app/todo', text)
    }
  })
}

function onTodoList({ value }) {
  let [ component, todos ] = this.state
  component.defaultProps = {
    todos: todos,
    onTodoClick: (id) => this.send('app/todo/toggle', id)
  }
}

function updateTodoList({ value }) {
  let todos = this.get('todos')
  if (typeof value === 'string') 
    todos.add({
      id: todos.size + 1,
      completed: false;
      text: value
    })
  else todos.add(value)
  this.send('app/todos', Array.from(todos))
}

function filterTodoList() {
  let [ todos, filter ] = this.state
  switch (filter) {
  case 'SHOW_ALL': break;
  case 'SHOW_COMPLETED': 
    todos = todos.filter(t => t.completed)
    break;
  case 'SHOW_ACTIVE':
    todos = todos.filter(t => !t.completed)
  }
  this.send('app/todos/filtered', todos)
}

function toggleTodo() {
  let [ todos, id ] = this.state
  let todo = todos[id-1]
  todo.completed = !todo.completed
  this.send('app/todo', todo)
  this.clear()
}

