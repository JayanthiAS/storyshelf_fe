import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminPublisherService } from '../../core/services/publisher.service';
import { CreatePublisherHouseResult, PublisherHouse } from '../../core/models/publisher.model';
import { GuruCardComponent, SpinnerComponent, EmptyStateComponent } from '../../shared/layout/layout.components';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-admin-publishers',
  standalone: true,
  imports: [CommonModule, RouterLink, GuruCardComponent, SpinnerComponent, EmptyStateComponent],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="mb-0">Publishers</h2>
      <a routerLink="/admin/publishers/new" class="btn btn-primary">Invite a house</a>
    </div>
    <p class="text-muted">Invite-only. Phase 1 hosts their books for free. They cannot publish to readers until you approve a book, which comes in the next step.</p>
    @if (inviteUrl()) {
      <div class="alert alert-success">
        <div class="fw-semibold mb-1">Copy this invite link now. It is not shown again.</div>
        <code class="user-select-all">{{ inviteUrl() }}</code>
        <div class="mt-2"><button type="button" class="btn btn-sm btn-outline-success" (click)="copy(inviteUrl()!)">Copy link</button></div>
      </div>
    }
    @if (loading()) { <app-spinner /> } @else if (!houses().length) {
      <app-empty-state message="No houses yet. Invite the first publishing house with a work email that is not already a reader account." />
    } @else {
      <app-guru-card title="Houses">
        <table class="table mb-0">
          <thead>
            <tr><th>House</th><th>Owner email</th><th>Status</th><th>Terms</th><th></th></tr>
          </thead>
          <tbody>
            @for (house of houses(); track house._id) {
              <tr>
                <td>
                  <div>{{ house.displayName }}</div>
                  <div class="text-muted small">{{ house.legalName }} · {{ house.country }}</div>
                </td>
                <td>{{ house.primaryContactEmail }}</td>
                <td><span class="badge text-bg-light">{{ house.status }}</span></td>
                <td>{{ house.agreement?.acceptedAt ? 'Accepted' : 'Waiting' }}</td>
                <td class="text-end">
                  @if (house.pendingInvite && house.status !== 'suspended') {
                    <button type="button" class="btn btn-sm btn-outline-primary me-1" (click)="resend(house)">New link</button>
                  }
                  @if (house.status === 'suspended') {
                    <button type="button" class="btn btn-sm btn-outline-success" (click)="reactivate(house)">Reactivate</button>
                  } @else {
                    <button type="button" class="btn btn-sm btn-outline-warning" (click)="suspend(house)">Suspend</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </app-guru-card>
    }
  `,
})
export class AdminPublishersComponent implements OnInit {
  private publishers = inject(AdminPublisherService);
  private toast = inject(ToastService);
  loading = signal(true);
  houses = signal<PublisherHouse[]>([]);
  inviteUrl = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.publishers.list().subscribe({
      next: (result) => {
        this.houses.set(result.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  resend(house: PublisherHouse): void {
    this.publishers.resend(house._id).subscribe({
      next: (result) => {
        this.inviteUrl.set(result.inviteUrl);
        this.toast.success('Previous invite was revoked. Copy the new link.');
        this.load();
      },
    });
  }

  suspend(house: PublisherHouse): void {
    this.publishers.suspend(house._id).subscribe({
      next: () => {
        this.toast.success(`${house.displayName} is suspended`);
        this.load();
      },
    });
  }

  reactivate(house: PublisherHouse): void {
    this.publishers.reactivate(house._id).subscribe({
      next: () => {
        this.toast.success(`${house.displayName} is active again`);
        this.load();
      },
    });
  }

  copy(url: string): void {
    navigator.clipboard.writeText(url).then(() => this.toast.success('Invite link copied'));
  }
}

@Component({
  selector: 'app-admin-publisher-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, GuruCardComponent],
  template: `
    <h2 class="mb-3">Invite a publishing house</h2>
    <app-guru-card title="House and owner">
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="row">
          <div class="col-md-6 mb-3">
            <label class="form-label">Legal name</label>
            <input class="form-control" formControlName="legalName" placeholder="Penguin Random House India" />
          </div>
          <div class="col-md-6 mb-3">
            <label class="form-label">Display name</label>
            <input class="form-control" formControlName="displayName" />
          </div>
        </div>
        <div class="row">
          <div class="col-md-6 mb-3">
            <label class="form-label">Country</label>
            <input class="form-control" formControlName="country" />
          </div>
          <div class="col-md-6 mb-3">
            <label class="form-label">Website</label>
            <input class="form-control" formControlName="website" placeholder="https://" />
          </div>
        </div>
        <div class="row">
          <div class="col-md-4 mb-3">
            <label class="form-label">Owner first name</label>
            <input class="form-control" formControlName="ownerFirstName" />
          </div>
          <div class="col-md-4 mb-3">
            <label class="form-label">Owner last name</label>
            <input class="form-control" formControlName="ownerLastName" />
          </div>
          <div class="col-md-4 mb-3">
            <label class="form-label">Owner work email</label>
            <input type="email" class="form-control" formControlName="ownerEmail" />
          </div>
        </div>
        <p class="text-muted small">Use a work email that is not already a reader or admin account. The link expires in 72 hours.</p>
        @if (error()) { <div class="alert alert-danger">{{ error() }}</div> }
        @if (created()) {
          <div class="alert alert-success">
            <div class="fw-semibold mb-1">House invited. Copy this link into an email for the owner. Open it in a private window if you want to stay signed in as admin.</div>
            <code class="user-select-all">{{ created()!.inviteUrl }}</code>
            <div class="mt-2">
              <button type="button" class="btn btn-sm btn-outline-success" (click)="copy()">Copy link</button>
              <a routerLink="/admin/publishers" class="btn btn-sm btn-link">Back to houses</a>
            </div>
          </div>
        }
        <button class="btn btn-primary" [disabled]="loading() || form.invalid || !!created()">Send invite</button>
        <a routerLink="/admin/publishers" class="btn btn-link">Cancel</a>
      </form>
    </app-guru-card>
  `,
})
export class AdminPublisherFormComponent {
  private fb = inject(FormBuilder);
  private publishers = inject(AdminPublisherService);
  private toast = inject(ToastService);
  loading = signal(false);
  error = signal('');
  created = signal<CreatePublisherHouseResult | null>(null);
  form = this.fb.group({
    legalName: ['', Validators.required],
    displayName: ['', Validators.required],
    country: ['', Validators.required],
    website: [''],
    ownerFirstName: ['', Validators.required],
    ownerLastName: ['', Validators.required],
    ownerEmail: ['', [Validators.required, Validators.email]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    const body = {
      legalName: value.legalName!.trim(),
      displayName: value.displayName!.trim(),
      country: value.country!.trim(),
      ownerFirstName: value.ownerFirstName!.trim(),
      ownerLastName: value.ownerLastName!.trim(),
      ownerEmail: value.ownerEmail!.trim().toLowerCase(),
      ...(value.website?.trim() ? { website: value.website.trim() } : {}),
    };
    this.publishers.create(body).subscribe({
      next: (result) => {
        this.created.set(result);
        this.loading.set(false);
        this.toast.success('Invite created');
      },
      error: (e) => {
        this.error.set(e.error?.message || 'Could not invite this house');
        this.loading.set(false);
      },
    });
  }

  copy(): void {
    const url = this.created()?.inviteUrl;
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => this.toast.success('Invite link copied'));
  }
}
