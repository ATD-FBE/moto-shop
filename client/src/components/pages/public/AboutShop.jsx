import React from 'react';
import TrackedImage from '@/components/common/TrackedImage.jsx';
import { COMPANY_DETAILS } from '@shared/company.js';
 
export default function AboutShop() {
    return (
        <div className="about-shop-page">
            <header className="about-shop-header">
                <h2>Информация о магазине</h2>
            </header>

            <div className="about-shop-main">
                <div className="section-info">
                    <a
                        href="images/shop_store.png"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Открыть в полном размере"
                    >
                        <TrackedImage
                            className="about-shop-image"
                            src="images/shop_store_preview.jpg"
                            alt="Shop Store"
                        />
                    </a>

                    <p>
                        Интернет-магазин
                        "<b>
                            <span className="letter-enhance">М</span>ото-
                            <span className="letter-enhance">М</span>агазин
                        </b>"
                        — это твой надёжный партнёр в мире мототехники, деталей, аксессуаров,
                        неонов на колёса, перчаток с шипами и прочей байкерской прелести.
                        Мы предлагаем товары для тех, кто:
                    </p>
                    <ul className="mt-short">
                        <li>только мечтает о мотоцикле,</li>
                        <li>уже купил, но ещё не знает, как переключать передачи,</li>
                        <li>и для тех, кто на спор переехал медведя на кроссовом байке.</li>
                    </ul>
                    
                    <p className="mt-short">
                        Ассортимент регулярно обновляется, и сейчас насчитывает... ну, много.
                        Очень много. Возможно, больше, чем ты сможешь унести даже на «Урале с
                        коляской». От расходников до редких мелочей, от стильной экипировки
                        до запчастей для нестандартных сборок — у нас найдётся всё, что нужно и
                        даже то, о чём ты не знал, что нужно.
                    </p>
                </div>

                <div className="section-info mt-large clear-float">
                    <h3>Наши услуги включают:</h3>
                    
                    <ul className="no-list-markers mt-short">
                        <li className="marked-text">
                            <span className="icon-marker color-blue">📦</span>
                            <p className="ml-large">
                                Комплектация заказов на основе VIN-номера, фото гайки или
                                "ну вот той фиговины справа под сиденьем".
                            </p>
                        </li>
                        <li className="marked-text">
                            <span className="icon-marker color-blue">⚙️</span>
                            <p className="ml-large">
                                Подбор аналогов при отсутствии оригинальных запчастей.
                            </p>
                        </li>
                        <li className="marked-text">
                            <span className="icon-marker color-blue">🚛</span>
                            <p className="ml-large">
                                Отправка заказов в кратчайшие сроки транспортными компаниями или,
                                при особом везении, на боевом дроне.
                            </p>
                        </li>
                        <li className="marked-text">
                            <span className="icon-marker color-blue">🛠️</span>
                            <p className="ml-large">
                                Консультации по подбору деталей под конкретную модификацию мотоцикла,
                                в том числе:
                            </p>
                            <ul className="ml-large mt-short mb-short">
                                <li>карбюраторы под китайские чудеса инженерии;</li>
                                <li>сальники вилки на три типа посадки;</li>
                                <li>брызговики, которые реально что-то брызжут.</li>
                            </ul>
                        </li>
                        <li className="marked-text">
                            <span className="icon-marker color-blue">💸</span>
                            <p className="ml-large">
                                Гибкая система скидок для постоянных клиентов и оптовиков,
                                готовых закупаться по-крупному. Просто напоминайте нам об этом,
                                чтобы мы успевали вовремя обновлять вашу скидку.
                            </p>
                        </li>
                        <li className="marked-text">
                            <span className="icon-marker color-blue">📬</span>
                            <p className="ml-large">
                                Работаем как по предоплате, так и по системе наложенного платежа
                                (до определённой суммы — не обнаглей).
                            </p>
                        </li>
                    </ul>

                    <p className="mt-large">
                        <i>У нас можно собрать мотоцикл с нуля: от болта до бензобака.</i> Причём не
                        обязательно, чтобы он потом ехал — главное, чтобы красиво стоял в гараже,
                        а соседи завидовали.
                    </p>
                </div>

                <div className="section-info mt-large">
                    <h3>Почему выбирают нас:</h3>

                    <ul className="no-list-markers mt-short">
                        <li className="marked-text">
                            <span className="icon-marker color-green">✔️</span>
                            <p className="ml-large">
                                Цены ниже, чем у перекупов на парковке.
                            </p>
                        </li>
                        <li className="marked-text">
                            <span className="icon-marker color-green">✔️</span>
                            <p className="ml-large">
                                Не нужно искать по всей сети — всё в одном месте.
                            </p>
                        </li>
                        <li className="marked-text">
                            <span className="icon-marker color-green">✔️</span>
                            <p className="ml-large">
                                Комбинируй всё что хочешь: запчасти, шлемы, масло, дудки, кофры —
                                в один заказ.
                            </p>
                        </li>
                        <li className="marked-text">
                            <span className="icon-marker color-green">✔️</span>
                            <p className="ml-large">
                                Уточнить размер, длину, объём и прочие параметры можно у нашего
                                оператора, который тоже ездит на байке. Иногда.
                            </p>
                        </li>
                        <li className="marked-text">
                            <span className="icon-marker color-green">✔️</span>
                            <p className="ml-large">
                                Обмен и возврат возможны, если товар ещё не стал частью твоей
                                кастом-легенды.
                            </p>
                        </li>
                        <li className="marked-text">
                            <span className="icon-marker color-green">✔️</span>
                            <p className="ml-large">
                                Мы не привязаны к конкретному региону — работаем по всей стране,
                                включая те места, где маркетплейсы боятся показываться.
                            </p>
                        </li>
                    </ul>
                </div>
                
                <div className="section-info mt-large">
                    <p>
                        Если ты оптовик — мы тоже тебя не забудем. Напиши нам
                        на <a href={`mailto:${COMPANY_DETAILS.emails.opt}`} className="email-link">
                            {COMPANY_DETAILS.emails.opt}
                        </a>,
                        и мы найдём общий язык (наши менеджеры проходят специальную подготовку
                        по переводу с «оптового» на «человеческий»).
                    </p>
                    <p className="marked-text mt-short">
                        <span className="icon-marker color-blue">📨</span>
                        <span className="ml-large">
                            По любым вопросам, предложениям или философским размышлениям на тему:
                            <i>«Что лучше — карбюратор или инжектор?»</i> — пиши нам.
                            Ответим с аргументами.
                        </span>
                    </p>
                </div>

                <div className="section-info mt-large">
                    <p>
                        <i>
                            "<b>
                                <span className="letter-enhance">М</span>ото-
                                <span className="letter-enhance">М</span>агазин
                            </b>"
                            — когда важно не просто ехать, а ехать с понятием.
                        </i>
                    </p>
                </div>
            </div>
        </div>
    );
}
