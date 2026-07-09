import { render } from '@testing-library/react';
import Delivery from '@/components/pages/public/Delivery.jsx';

describe('Delivery Component Snapshot', () => {
    it('должен корректно рендерить страницу доставки и соответствовать снимку', () => {
        // Рендер компонента в виртуальный браузер jsdom
        const { asFragment } = render(<Delivery />);

        // Снимок структуры HTML и сравнение с сохранённым снимком в файле .snap
        expect(asFragment()).toMatchSnapshot();
    });
});
