alter table public.media
  add column mime_type text not null,
  add column size_bytes bigint not null,
  add constraint media_mime_type_is_supported
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')),
  add constraint media_size_bytes_is_valid
    check (size_bytes > 0 and size_bytes <= 5242880);
