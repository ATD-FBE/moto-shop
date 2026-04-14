export default function Licenses() {
    return (
        <div className="licenses-page">
            <header className="licenses-header">
                <h2>Лицензии и сертификаты на товары</h2>
            </header>

            <div className="licenses-main">
                <p>
                    Подтверждение легальности и соответствия реализуемых товаров
                    установленным требованиям.<br />
                    Документ содержит разрешительную и сертификационную информацию.
                </p>
                <p>
                    <a
                        href="docs/licenses.pdf"
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
