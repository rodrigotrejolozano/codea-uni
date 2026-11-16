import {
  act,
  render,
  screen,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import { toast, Toaster } from 'sonner';
import { expect, it } from 'vitest';

it('removes a success notification after its configured duration', async () => {
  render(<Toaster duration={100} />);
  act(() => {
    toast.success('Operación completada');
  });
  const notification = await screen.findByText('Operación completada');
  await waitForElementToBeRemoved(notification, { timeout: 2500 });
  expect(screen.queryByText('Operación completada')).not.toBeInTheDocument();
});
