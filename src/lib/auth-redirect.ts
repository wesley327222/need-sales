/** Para onde redirecionar um usuário autenticado, de acordo com o papel do perfil. */
export function roleHomePath(role: string | null | undefined): string {
  return role === 'seller' ? '/vendor/dashboard' : '/dashboard'
}
