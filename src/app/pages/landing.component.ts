import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-[#f5f7fb] text-[#182033]">
      <header class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a routerLink="/" class="flex items-center gap-2.5">
          <span class="w-8 h-8 rounded-lg bg-[#2454d6] text-white font-extrabold flex items-center justify-center">C</span>
          <span class="text-[19px] font-extrabold tracking-tight">ClassLink</span>
        </a>
        <nav class="flex items-center gap-2">
          <a routerLink="/login" class="text-sm font-bold px-4 py-2 rounded-xl hover:bg-white">Se connecter</a>
          <a
            routerLink="/login"
            [queryParams]="{ mode: 'signup' }"
            class="text-sm font-bold px-4 py-2 rounded-xl bg-[#2454d6] hover:bg-[#1d46b8] text-white"
            >S'inscrire</a
          >
        </nav>
      </header>

      <!-- Hero -->
      <section class="max-w-6xl mx-auto px-6 pt-12 pb-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <p class="text-[11px] font-extrabold uppercase tracking-wider text-[#2454d6] mb-2">
            Plateforme de classes en ligne
          </p>
          <h1 class="text-4xl md:text-5xl font-extrabold leading-tight">
            Enseignez et apprenez,
            <span class="block text-[#2454d6]">au même endroit.</span>
          </h1>
          <p class="text-slate-600 mt-4 text-base leading-relaxed">
            ClassLink réunit enseignants et étudiants : créez ou rejoignez une classe, partagez des cours,
            publiez des devoirs, rendez vos travaux et suivez vos notes, sans rien perdre de vue.
          </p>
          <div class="flex flex-wrap gap-3 mt-7">
            <a
              routerLink="/login"
              [queryParams]="{ mode: 'signup' }"
              class="bg-[#2454d6] hover:bg-[#1d46b8] text-white font-bold text-sm rounded-xl px-6 py-3 shadow-xs"
              >Commencer gratuitement</a
            >
            <a routerLink="/login" class="bg-white border border-slate-200 font-bold text-sm rounded-xl px-6 py-3 hover:bg-slate-50"
              >J'ai déjà un compte</a
            >
          </div>
        </div>

        <!-- Mock preview -->
        <div class="bg-white rounded-3xl border border-slate-200/80 shadow-md p-5 space-y-3">
          <div class="rounded-2xl p-4 text-white bg-gradient-to-r from-[#2454d6] to-[#3b6ef5]">
            <p class="text-[10px] font-extrabold uppercase tracking-wider text-white/85">Informatique</p>
            <p class="font-extrabold text-lg">Développement Web</p>
            <p class="text-xs text-white/90">Pr. Dupont · 28 membres</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-2xl p-4 text-white bg-gradient-to-r from-[#6d48d9] to-[#865ef6]">
              <p class="text-[10px] font-extrabold uppercase">Maths</p>
              <p class="font-bold text-sm">Algèbre</p>
            </div>
            <div class="rounded-2xl p-4 text-white bg-gradient-to-r from-[#1d8a64] to-[#27a87c]">
              <p class="text-[10px] font-extrabold uppercase">Sciences</p>
              <p class="font-bold text-sm">Physique</p>
            </div>
          </div>
          <div class="rounded-xl bg-orange-50 text-orange-700 text-xs font-semibold px-3 py-2">
            À rendre bientôt : TP n°3 · demain 23:59
          </div>
        </div>
      </section>

      <!-- Features -->
      <section class="max-w-6xl mx-auto px-6 pb-16">
        <h2 class="text-2xl font-extrabold text-center mb-8">Ce que vous pouvez faire avec ClassLink</h2>
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          @for (f of features; track f.title) {
            <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
              <div class="text-2xl mb-2">{{ f.icon }}</div>
              <h3 class="font-extrabold text-sm">{{ f.title }}</h3>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">{{ f.text }}</p>
            </div>
          }
        </div>
      </section>

      <!-- Two roles -->
      <section class="max-w-6xl mx-auto px-6 pb-16 grid md:grid-cols-2 gap-5">
        <div class="bg-white rounded-2xl border border-slate-200/80 p-6">
          <h3 class="font-extrabold text-lg text-[#2454d6]">Pour les enseignants</h3>
          <ul class="mt-3 space-y-1.5 text-sm text-slate-600 list-disc pl-5">
            <li>Créez des classes et invitez vos étudiants avec un code</li>
            <li>Publiez annonces, cours et devoirs avec date limite</li>
            <li>Corrigez et notez les remises</li>
            <li>Archivez les classes terminées</li>
          </ul>
        </div>
        <div class="bg-white rounded-2xl border border-slate-200/80 p-6">
          <h3 class="font-extrabold text-lg text-[#2454d6]">Pour les étudiants</h3>
          <ul class="mt-3 space-y-1.5 text-sm text-slate-600 list-disc pl-5">
            <li>Rejoignez une classe avec son code d'accès</li>
            <li>Consultez cours et échéances dans le calendrier</li>
            <li>Rendez vos devoirs en ligne</li>
            <li>Suivez vos notes et recevez des notifications</li>
          </ul>
        </div>
      </section>

      <footer class="text-center text-xs text-slate-400 pb-8">© ClassLink</footer>
    </div>
  `,
})
export class LandingComponent {
  readonly features = [
    { icon: '🏫', title: 'Classes', text: 'Créez ou rejoignez des classes en quelques secondes grâce à un code d’accès.' },
    { icon: '📝', title: 'Devoirs & cours', text: 'Publiez et consultez supports, annonces et devoirs au même endroit.' },
    { icon: '📅', title: 'Calendrier', text: 'Visualisez toutes vos échéances et ne ratez plus une date limite.' },
    { icon: '🔔', title: 'Notifications', text: 'Soyez averti des nouvelles publications et des notes.' },
  ];
}
