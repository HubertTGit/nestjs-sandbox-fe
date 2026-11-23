import type { components } from './schema'

type TodoDto = components['schemas']['TodoDto']
type CreateTodoDto = components['schemas']['CreateTodoDto']
type UpdateTodoDto = components['schemas']['UpdateTodoDto']

export interface Todo extends TodoDto {}
export interface CreateTodo extends CreateTodoDto {}
export interface UpdateTodo extends UpdateTodoDto {}
