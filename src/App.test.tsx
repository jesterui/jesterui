import { render, screen } from '@testing-library/react'

it('dummy', () => {
  render(<div data-testid="test-element">Test</div>)

  const testElement = screen.getByTestId('test-element')
  expect(testElement).toBeInTheDocument()
})
