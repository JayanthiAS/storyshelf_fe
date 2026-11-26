import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PublisherService } from '../../core/services/publisher.service';
import {
  PublisherSession,
  PublisherStaffList,
  PublisherStaffMember,
} from '../../core/models/publisher.model';
import { GuruCardComponent, SpinnerComponent } from '../../shared/layout/layout.components';

@Component({
  selector: 'app-publisher-team',
  standalone: true,
  imports: [ReactiveFormsModule, GuruCardComponent, SpinnerComponent],
  template: `
    <h2 class="mb-1">Team</h2>
    <p class="text-muted">Editors can prepare books. Viewers can look. Only the owner can invite or remove people.</p>
    @if (loading()) {
      <app-spinner />
    } @else {
      @if (session()?.organization?.status === 'suspended') {
        <div class="alert alert-warning">This house is suspended. Invites stay paused until Storyshelf reactivates it.</div>
      }
      @if (link()) {
        <div class="alert alert-success">
          <div class="fw-semibold mb-1">Copy this link into an email. It expires in 72 hours. Open it in a private window if you want to stay signed in.</div>
          <code class="user-select-all">{{ link() }}</code>
          <div class="mt-2">
            <button type="button" class="btn btn-sm btn-outline-success" (click)="copy()">Copy link</button>
          </div>
        </div>
      }
      <app-guru-card title="People">
        <div class="table-responsive">
          <table class="table align-middle mb-0">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr>
            </thead>
            <tbody>
              @for (member of staff()?.members ?? []; track member._id) {
                <tr>
                  <td>{{ member.firstName }} {{ member.lastName }}</td>
                  <td>{{ member.email }}</td>
                  <td>
                    @if (owner() && member.orgRole !== 'owner') {
                      <select class="form-select form-select-sm" [value]="member.orgRole" (change)="changeRole(member, $event)">
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    } @else {
                      {{ label(member.orgRole) }}
                    }
                  </td>
                  <td class="text-end">
                    @if (owner() && member.orgRole !== 'owner') {
                      <button type="button" class="btn btn-sm btn-outline-danger" (click)="remove(member)">Remove</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-guru-card>
      @if ((staff()?.invites?.length ?? 0) > 0) {
        <app-guru-card title="Pending invites" class="mt-3 d-block">
          <ul class="list-group list-group-flush">
            @for (invite of staff()!.invites; track invite._id) {
              <li class="list-group-item d-flex justify-content-between align-items-center gap-2">
                <span>{{ invite.firstName }} {{ invite.lastName }} · {{ invite.email }} · {{ label(invite.orgRole) }}</span>
                @if (owner()) {
                  <span class="d-flex gap-2">
                    <button type="button" class="btn btn-sm btn-outline-primary" (click)="resend(invite._id)">New link</button>
                    <button type="button" class="btn btn-sm btn-outline-secondary" (click)="revoke(invite._id)">Cancel</button>
                  </span>
                }
              </li>
            }
          </ul>
        </app-guru-card>
      }
      @if (owner()) {
        <app-guru-card title="Invite someone" class="mt-3 d-block">
          <form [formGroup]="form" (ngSubmit)="invite()" class="row g-2">
            <div class="col-md-3">
              <input class="form-control" placeholder="First name" formControlName="firstName" />
            </div>
            <div class="col-md-3">
              <input class="form-control" placeholder="Last name" formControlName="lastName" />
            </div>
            <div class="col-md-3">
              <input type="email" class="form-control" placeholder="Work email" formControlName="email" />
            </div>
            <div class="col-md-2">
              <select class="form-select" formControlName="orgRole">
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <div class="col-md-1">
              <button class="btn btn-primary w-100" [disabled]="saving() || form.invalid || suspended()">Invite</button>
            </div>
          </form>
          <p class="text-muted small mt-2 mb-0">Use a work email that is not already a reader or admin account. A removed person can be invited again with the same email.</p>
        </app-guru-card>
      }
    }
  `,
})
export class PublisherTeamComponent implements OnInit {
  private publishers = inject(PublisherService);
  private fb = inject(FormBuilder);
  loading = signal(true);
  saving = signal(false);
  session = signal<PublisherSession | null>(null);
  staff = signal<PublisherStaffList | null>(null);
  link = signal('');
  form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    orgRole: ['editor' as 'editor' | 'viewer', Validators.required],
  });

  ngOnInit(): void {
    this.publishers.me().subscribe({
      next: (session) => {
        this.session.set(session);
        this.loadStaff();
      },
      error: () => this.loading.set(false),
    });
  }

  owner(): boolean {
    return this.session()?.membership?.orgRole === 'owner';
  }

  suspended(): boolean {
    return this.session()?.organization?.status === 'suspended';
  }

  label(role: string): string {
    if (role === 'owner') return 'Owner';
    if (role === 'editor') return 'Editor';
    return 'Viewer';
  }

  invite(): void {
    if (this.form.invalid || this.suspended()) return;
    this.saving.set(true);
    const value = this.form.getRawValue();
    this.publishers.inviteStaff(value).subscribe({
      next: (result) => {
        this.link.set(result.inviteUrl);
        this.form.reset({ firstName: '', lastName: '', email: '', orgRole: 'editor' });
        this.saving.set(false);
        this.loadStaff();
      },
      error: () => this.saving.set(false),
    });
  }

  changeRole(member: PublisherStaffMember, event: Event): void {
    const orgRole = (event.target as HTMLSelectElement).value as 'editor' | 'viewer';
    this.publishers.updateStaffRole(member._id, orgRole).subscribe({
      next: () => this.loadStaff(),
      error: () => this.loadStaff(),
    });
  }

  remove(member: PublisherStaffMember): void {
    if (!confirm(`Remove ${member.email} from this house?`)) return;
    this.publishers.removeStaff(member._id).subscribe({ next: () => this.loadStaff() });
  }

  resend(id: string): void {
    this.publishers.resendStaffInvite(id).subscribe({
      next: (result) => {
        this.link.set(result.inviteUrl);
        this.loadStaff();
      },
    });
  }

  revoke(id: string): void {
    this.publishers.revokeStaffInvite(id).subscribe({ next: () => this.loadStaff() });
  }

  copy(): void {
    void navigator.clipboard.writeText(this.link());
  }

  private loadStaff(): void {
    this.publishers.staff().subscribe({
      next: (staff) => {
        this.staff.set(staff);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
