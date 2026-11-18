import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-avatar',
  standalone: true,
  template: `<span class="avatar" [class.small]="small">{{ initials }}</span>`,
})
export class AvatarComponent {
  @Input({ required: true }) name!: string;
  @Input() small = false;

  get initials(): string {
    return this.name
      .split(' ')
      .map((x) => x[0] ?? '')
      .join('')
      .slice(0, 2);
  }
}
