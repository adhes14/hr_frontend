export interface PasswordValidationResult {
	valid: boolean;
	errors: string[];
}

export interface PasswordRule {
	description: string;
}

export const PASSWORD_RULES: PasswordRule[] = [
	{ description: 'Al menos 6 caracteres' },
	{ description: 'Al menos una letra mayúscula' },
	{ description: 'Al menos una letra minúscula' },
	{ description: 'Al menos un dígito' }
];

const ERROR_MESSAGES = {
	minLength: 'La contraseña debe tener al menos 6 caracteres',
	upperCase: 'La contraseña debe contener al menos una mayúscula',
	lowerCase: 'La contraseña debe contener al menos una minúscula',
	digit: 'La contraseña debe contener al menos un dígito'
};

export function validatePassword(
	password: string
): PasswordValidationResult {
	const errors: string[] = [];

	if (password.length < 6) {
		errors.push(ERROR_MESSAGES.minLength);
	}
	if (!/[A-Z]/.test(password)) {
		errors.push(ERROR_MESSAGES.upperCase);
	}
	if (!/[a-z]/.test(password)) {
		errors.push(ERROR_MESSAGES.lowerCase);
	}
	if (!/\d/.test(password)) {
		errors.push(ERROR_MESSAGES.digit);
	}

	return {
		valid: errors.length === 0,
		errors
	};
}
