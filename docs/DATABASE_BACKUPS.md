# Database Backup and Disaster Recovery Strategy

Drizzle ORM manages our schema state, but **infrastructure-level backup strategies are required** to ensure data durability in the event of an emergency (e.g. accidental data deletion or provider outage).

Since Nafex Hub handles financial escrow and loyalty coins, data loss is unacceptable. You must configure your Postgres provider (Neon, Supabase, or AWS RDS) with the following safeguards.

## 1. Continuous WAL Archiving & PITR

Write-Ahead Log (WAL) archiving allows for **Point-In-Time-Recovery (PITR)**. This means if a critical error occurs at 2:05 PM, you can restore the database to exactly its state at 2:04 PM.

**Action Required:**
- **Neon DB:** Ensure the compute endpoint is configured for PITR. (Neon enables 7-day PITR out-of-the-box on paid tiers).
- **Supabase:** Navigate to `Database -> Backups -> PITR` and enable it with a minimum 7-day retention period.
- **AWS RDS:** Ensure `backup_retention_period` is set to 7 days, which implicitly enables automated snapshots and WAL archiving.

## 2. Logical Backups (Offsite Cold Storage)

Relying solely on your hosting provider's snapshots is risky (e.g., if the provider locks your account). You must configure a daily logical dump using `pg_dump`.

**Action Required:**
Create a GitHub Actions workflow or a CRON job on a secure internal server to run daily at 00:00 UTC:

```bash
# 1. Dump the entire database logically
pg_dump $DATABASE_URL -F c -Z 9 -f nafex_backup_$(date +%F).dump

# 2. Encrypt the backup (optional but highly recommended for PII)
gpg --symmetric --cipher-algo AES256 nafex_backup_$(date +%F).dump

# 3. Upload to an offsite S3 bucket (e.g., AWS S3 or Cloudflare R2)
aws s3 cp nafex_backup_$(date +%F).dump.gpg s3://nafex-cold-backups/
```

## 3. Disaster Recovery Validation

Backups are only as good as your ability to restore them.
- **Monthly Drill:** On the 1st of every month, download the latest `.dump` file and attempt to restore it to a local Docker Postgres instance (`pg_restore -d testdb nafex_backup.dump`). Verify that user coin balances and escrow states are intact.
