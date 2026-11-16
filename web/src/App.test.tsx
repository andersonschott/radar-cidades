import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from './App.tsx'

test('mostra o placeholder com o nome do produto e o aviso de independência', () => {
  render(<App />)

  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Radar Cidades')
  expect(screen.getByText(/em breve/i)).toBeInTheDocument()
  expect(screen.getByRole('contentinfo')).toHaveTextContent(
    'Projeto independente. Sem vínculo com Câmara, Prefeitura ou partido.',
  )
})
