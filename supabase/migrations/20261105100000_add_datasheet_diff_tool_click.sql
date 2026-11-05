-- Allow click analytics for the Datasheet 規格比對工具 card (id: datasheet-diff).
begin;
alter table public.portal_tool_clicks
  drop constraint if exists portal_tool_clicks_tool_id_check;
alter table public.portal_tool_clicks
  add constraint portal_tool_clicks_tool_id_check check (tool_id in (
    'tto-analysis','jb-booking','dl-to-excel','cz-dataset','dl-analysis',
    'yield-summary','cp-mss-converter','dongle-summary','writer','eng_report',
    'te_tto','pp00-knowledge-agent','datasheet-diff'
  ));
commit;
