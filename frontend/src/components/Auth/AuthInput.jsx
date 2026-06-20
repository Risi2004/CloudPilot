import React, { useState } from 'react';

function AuthInput({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  prefixIcon,
  rightLabelAction,
  required = true,
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPasswordField = type === 'password';

  // Determine actual type to render for input
  const inputType = isPasswordField
    ? (isPasswordVisible ? 'text' : 'password')
    : type;

  return (
    <div className="input-group">
      <div className="input-label-row">
        <label className="input-label">{label}</label>
        {rightLabelAction}
      </div>
      <div className="input-field-container">
        {prefixIcon && (
          <span className="input-prefix-icon-wrapper">
            <img src={prefixIcon} alt="" className="input-prefix-icon" />
          </span>
        )}
        <input
          type={inputType}
          className="auth-input-element"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
        />
        {isPasswordField && (
          <button
            type="button"
            className="toggle-password-visibility-btn"
            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
            aria-label="Toggle Password Visibility"
          >
            {isPasswordVisible ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default AuthInput;
