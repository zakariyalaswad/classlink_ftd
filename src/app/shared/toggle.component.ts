import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-toggle',
  standalone: true,
  template: `
    <button
      type="button"
      role="switch"
      [attr.aria-checked]="checked"
      [attr.aria-label]="label"
      class="toggle"
      [class.checked]="checked"
      (click)="onChange.emit(!checked)"
    >
      <span></span>
    </button>
  `,
})
export class ToggleComponent {
  @Input() checked = false;
  @Input() label = '';
  @Output() onChange = new EventEmitter<boolean>();
}
