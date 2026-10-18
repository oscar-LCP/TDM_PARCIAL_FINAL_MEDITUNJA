(() => {
	const form = document.querySelector('main form');
	const epsSelect = document.getElementById('eps');
	const documentField = document.getElementById('documento-eps-field');
	const documentInput = document.getElementById('documento-eps');

	if (!form || !epsSelect || !documentField || !documentInput) return;

	const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];

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
			allowedExtensions.includes(extension) ? '' : 'Adjunta un archivo PDF, JPG o PNG.'
		);
	}

	epsSelect.addEventListener('change', updateDocumentRequirement);
	documentInput.addEventListener('change', validateDocument);
	form.addEventListener('submit', (event) => {
		validateDocument();
		if (!form.checkValidity()) {
			event.preventDefault();
			form.reportValidity();
		}
	});

	updateDocumentRequirement();
})();
