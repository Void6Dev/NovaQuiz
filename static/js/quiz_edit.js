document.addEventListener('DOMContentLoaded', function () {
  const addBtn = document.getElementById('add-answer-btn');
  const answersContainer = document.getElementById('answers-container');
  const totalForms = document.getElementById('id_form-TOTAL_FORMS');
  const templateDiv = document.getElementById('answer-form-template');

  addBtn.addEventListener('click', () => {
    const formCount = parseInt(totalForms.value, 10) || 0;
    const newFormHtml = templateDiv.innerHTML.replace(/__prefix__/g, formCount);
    const temp = document.createElement('div');

    temp.innerHTML = newFormHtml.trim();
    const newForm = temp.firstElementChild;
    
    answersContainer.appendChild(newForm);
    totalForms.value = formCount + 1;
    newForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  answersContainer.addEventListener('click', function (e) {
    if (e.target.matches('.delete-answer')) {
      const formElem = e.target.closest('.answer-form');
      const deleteInput = formElem.querySelector('input[name$="-DELETE"]');
      
      if (deleteInput) {
        deleteInput.checked = true;  
      }
      formElem.remove();
    }
  });

  answersContainer.addEventListener('change', function(e) {
  if (e.target.matches('.file-label input[type="file"]')) {
    const fileInput = e.target;
    const label = fileInput.closest('.file-label');
    const fileNameDisplay = label.querySelector('.file-name');
    const preview = label.closest('.form-row, .file-upload, .preview-container')
                         .querySelector('img.image-preview, #preview');

    if (fileInput.files && fileInput.files[0]) {
      fileNameDisplay.textContent = fileInput.files[0].name;
      const reader = new FileReader();
      reader.onload = function(ev) {
        preview.src = ev.target.result;
        preview.style.display = 'none'; 
      };
      reader.readAsDataURL(fileInput.files[0]);
    } else {
      fileNameDisplay.textContent = '📎 Прикрепите изображение(необязательно)';
      preview.style.display = 'none';
    }
  }
  });
  answersContainer.addEventListener('mouseenter', function(e) {
    if (e.target.matches('.file-name')) {
      const label = e.target.closest('.file-label');
      const preview = label.closest('.form-row, .file-upload, .preview-container')
                          .querySelector('img.image-preview, #preview');
      if (preview && preview.src) {
        preview.style.display = 'block';
      }
    }
  }, true);

  answersContainer.addEventListener('mouseleave', function(e) {
    if (e.target.matches('.file-name')) {
      const label = e.target.closest('.file-label');
      const preview = label.closest('.form-row, .file-upload, .preview-container')
                          .querySelector('img.image-preview, #preview');
      if (preview) {
        preview.style.display = 'none';
      }
    }
  }, true);

});