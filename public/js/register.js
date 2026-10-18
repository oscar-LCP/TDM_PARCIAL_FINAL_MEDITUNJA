(() => {
	const form = document.querySelector('main form');
	const epsSelect = document.getElementById('eps');
	const documentField = document.getElementById('documento-eps-field');
	const documentInput = document.getElementById('documento-eps');

	if (!form || !epsSelect || !documentField || !documentInput) return;

	const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
	const maxFileSize = 5 * 1024 * 1024;
	const message = document.getElementById('registro-mensaje');

	function updateDocumentRequirement() {
		const needsDocument = epsSelect.value !== '' && epsSelect.value !== 'particular';
		documentField.hidden = !needsDocument;
		documentInput.required = needsDocument;
		if (!needsDocument) {
			documentInput.value = '';
			documentInput.setCustomValidity('');
		}
	}

	function validateDocument() {
		const file = documentInput.files && documentInput.files[0];
		if (!file) {
			documentInput.setCustomValidity('');
			return;
		}

		const extension = file.name.split('.').pop().toLowerCase();
		documentInput.setCustomValidity(
			!allowedExtensions.includes(extension)
				? 'Adjunta un archivo PDF, JPG o PNG.'
				: file.size > maxFileSize
					? 'El archivo no puede superar los 5 MB.'
					: ''
		);
	}

	function readFile(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.addEventListener('load', () => resolve(String(reader.result).split(',')[1]));
			reader.addEventListener('error', () => reject(new Error('No se pudo leer el archivo.')));
			reader.readAsDataURL(file);
		});
	}

	epsSelect.addEventListener('change', updateDocumentRequirement);
	documentInput.addEventListener('change', validateDocument);
	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		validateDocument();
		if (!form.checkValidity()) {
			form.reportValidity();
			return;
		}

		const submitButton = form.querySelector('[type="submit"]');
		const payload = Object.fromEntries(new FormData(form).entries());
		const file = documentInput.files && documentInput.files[0];
		delete payload.documento_eps;
		if (file) {
			try {
				payload.documento_eps = {
					name: file.name,
					type: file.type,
					data: await readFile(file)
				};
			} catch (error) {
				message.textContent = error.message;
				return;
			}
		}

		submitButton.disabled = true;
		message.textContent = 'Enviando solicitud...';
		try {
			const response = await fetch(form.action, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.mensaje || 'No se pudo completar el registro.');
			message.textContent = result.mensaje;
			form.reset();
			updateDocumentRequirement();
		} catch (error) {
			message.textContent = error.message || 'No se pudo conectar con el servidor.';
		} finally {
			submitButton.disabled = false;
		}
	});

	updateDocumentRequirement();
})();
