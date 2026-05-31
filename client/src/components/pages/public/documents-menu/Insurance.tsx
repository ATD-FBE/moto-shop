import type { JSX } from 'react';
 
export default function Insurance(): JSX.Element {
    return (
        <div className="insurance-page">
            <header className="insurance-header">
                <h2>Страхование грузов</h2>
            </header>

            <div className="insurance-main">
                <p>
                    Сведения о страховании товаров и ответственности магазина.<br />
                    Описание условий страхового покрытия и возможных вариантов компенсации.
                </p>
                <p>
                    <a
                        href="docs/insurance.pdf"
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="doc-link"
                    >
                        <span className="icon">📄</span>
                        Документ в формате PDF
                    </a>
                </p>
            </div>
        </div>
    );
}
