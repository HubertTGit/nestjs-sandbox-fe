import type { components } from './schema'

type TodoDto = components['schemas']['TodoDto']
type CreateTodoDto = components['schemas']['CreateTodoDto']
type UpdateTodoDto = components['schemas']['UpdateTodoDto']
type AuthUserDto = components['schemas']['AuthUserDto']
type GoogleAuthDto = components['schemas']['GoogleAuthDto']
type AccessTokenResponseDto = components['schemas']['AccessTokenResponseDto']

export interface Todo extends TodoDto {}
export interface CreateTodo extends CreateTodoDto {}
export interface UpdateTodo extends UpdateTodoDto {}

export interface AuthUser extends Omit<AuthUserDto, 'name'> {
  name?: string | null
}

export interface GoogleAuthRequest extends GoogleAuthDto {}

export interface AccessTokenResponse
  extends Omit<AccessTokenResponseDto, 'user'> {
  user: AuthUser
}
