import { render } from '@testing-library/angular';
import { About } from './about';

describe('About Component', () => {
  it('should render the about page', async () => {
    const { getByText } = await render(About);
    expect(getByText('About')).toBeTruthy();
  });
});
