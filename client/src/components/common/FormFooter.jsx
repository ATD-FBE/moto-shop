import cn from 'classnames';
import { FORM_STATUS } from '@/config/constants.js';

export default function FormFooter({
    submitStates,
    submitStatus,
    uiBlocked,
    reloadBtnLabel = 'Повторить',
    reloadData = null
}) {
    const submitState = submitStates[submitStatus] ?? {};

    return (
        <div className="form-footer">
            <div className={cn('form-status', submitState.intent)}>
                <div className="icon-box">
                    {submitState.icon || ''}
                </div>

                <div className="message-box">
                    <p className="main-message">
                        {submitState.mainMessage || ''}
                    </p>
                    <p className="additional-message">
                        {submitState.addMessage || ''}

                        {submitStatus === FORM_STATUS.LOAD_ERROR && !!reloadData && (
                            <button type="button" className="reload-btn" onClick={reloadData}>
                                {reloadBtnLabel}
                            </button>
                        )}
                    </p>
                </div>
            </div>

            <div className="submit-btn-wrapper">
                <button
                    type="submit"
                    name="submit-button"
                    disabled={uiBlocked}
                >
                    {submitState.submitBtnLabel || ''}
                </button>
            </div>
        </div>
    );
}
