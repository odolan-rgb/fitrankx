create or replace function update_rank_on_pts_change()
returns trigger as $$
begin
  new.rank := case
    when new.pts >= 15000 then 'LEGEND'
    when new.pts >= 8000  then 'SAVAGE'
    when new.pts >= 4000  then 'ELITE'
    when new.pts >= 1500  then 'BEAST'
    when new.pts >= 500   then 'ATHLETE'
    else 'ROOKIE'
  end;
  return new;
end;
$$ language plpgsql;

drop trigger if exists rank_update_trigger on public.profiles;

create trigger rank_update_trigger
  before update of pts on public.profiles
  for each row execute procedure update_rank_on_pts_change();
