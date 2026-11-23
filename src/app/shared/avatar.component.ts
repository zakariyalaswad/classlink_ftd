import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-avatar',
  standalone: true,
  template: `
    @if (photoUrl) {
      <img
        [src]="photoUrl"
        [alt]="name"
        [class]="
          (size === 'small' ? 'w-8 h-8' : 'w-9 h-9') +
          ' rounded-full object-cover shrink-0 border border-blue-200/60 shadow-xs select-none'
        "
      />
    } @else {
      <span
        [class]="
          (size === 'small' ? 'w-8 h-8 text-[11px]' : 'w-9 h-9 text-xs') +
          ' rounded-full bg-blue-100 text-blue-700 font-bold inline-flex items-center justify-center shrink-0 border border-blue-200/60 shadow-xs select-none'
        "
        aria-hidden="true"
      >
        {{ initials() }}
      </span>
    }
  `,
})
export class AvatarComponent {
  @Input() name = '';
  @Input() photoUrl: string | null | undefined = null;
  @Input() size: 'small' | 'medium' = 'medium';

  initials(): string {
    const parts = this.name.trim().split(/\s+/);
    if (!parts.length) return 'C';
    const first = parts[0][0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase() || 'C';
  }
}
