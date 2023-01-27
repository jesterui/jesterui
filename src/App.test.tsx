import { render, screen } from '@testing-library/react'
import App from './App'

it('should be rendered without errors', () => {
  render(<App />)

  const linkElement = screen.getByText('View on GitHub')
  expect(linkElement).toBeInTheDocument()
})
