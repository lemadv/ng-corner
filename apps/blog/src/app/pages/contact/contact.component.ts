import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

export interface ContactForm {
  name: FormControl<string>;
  email: FormControl<string>;
  subject: FormControl<string>;
  message: FormControl<string>;
}

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent {
  loading = signal(false);
  submitted = signal(false);

  contactForm = new FormGroup<ContactForm>({
    name: new FormControl('', { 
      nonNullable: true, 
      validators: [Validators.required, Validators.minLength(2)] 
    }),
    email: new FormControl('', { 
      nonNullable: true, 
      validators: [Validators.required, Validators.email] 
    }),
    subject: new FormControl('', { 
      nonNullable: true, 
      validators: [Validators.required, Validators.minLength(5)] 
    }),
    message: new FormControl('', { 
      nonNullable: true, 
      validators: [Validators.required, Validators.minLength(10)] 
    })
  });

  async onSubmit() {
    if (this.contactForm.valid) {
      this.loading.set(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      this.loading.set(false);
      this.submitted.set(true);
      this.contactForm.reset();
      
      // Reset submitted state after 5 seconds
      setTimeout(() => this.submitted.set(false), 5000);
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.contactForm.controls).forEach(key => {
      const control = this.contactForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: keyof ContactForm): string | null {
    const field = this.contactForm.get(fieldName);
    if (field?.touched && field?.errors) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['email']) return 'Please enter a valid email address';
      if (field.errors['minlength']) {
        const requiredLength = field.errors['minlength'].requiredLength;
        return `${fieldName} must be at least ${requiredLength} characters long`;
      }
    }
    return null;
  }

  isFieldInvalid(fieldName: keyof ContactForm): boolean {
    const field = this.contactForm.get(fieldName);
    return !!(field?.touched && field?.errors);
  }
}