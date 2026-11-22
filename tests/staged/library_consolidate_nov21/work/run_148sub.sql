insert into pb_ai.eval_runs(run, fn, label, k, ids, cases) with s as (select *, (row_number() over (order by id) - 1) / 3 g from pb_ai.eval_set where id = any(array['lo1','lo2','lo3','lo4','lo5','lo6','lo7','loc5','loc6','ng1','ng4','nw1','nw2','nw3','nw4','nw5','nw6','nw7','nw8','nw9','nw10','nw11','nw12','nw13','nw14','nw15','nw16','nw17','nw22','sa1','sa4','sa5','sa9','sa10','tr1','tr2','tr3','tr4','tr5','tr6','tr7','tr8','tr9','tr10','tr11','tr12','tr13','tr14','eq5','em1']))
  select '1121-consol-148sub', 'ai-next', 'consol1: trench+811 subset of the 148', 1000 + g, array_agg(id), jsonb_agg(jsonb_build_object('id', id, 'q', q, 'where', "where", 'level', level)
      || case when images is null then '{}'::jsonb else jsonb_build_object('images', images) end
      || case when image_ids is null then '{}'::jsonb else jsonb_build_object('image_ids', to_jsonb(image_ids)) end
      || case when feature is null then '{}'::jsonb else jsonb_build_object('feature', feature) end
      || case when model is null then '{}'::jsonb else jsonb_build_object('model', model) end) from s group by g;
select pb_ai.eval_pump('1121-consol-148sub') started, (select count(*) from pb_ai.eval_runs where run = '1121-consol-148sub') batches;
