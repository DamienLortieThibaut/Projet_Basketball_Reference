# Define here the models for your scraped items
#
# See documentation in:
# https://docs.scrapy.org/en/latest/topics/items.html

import scrapy
from scrapy.loader import ItemLoader
from scrapy.loader.processors import TakeFirst, MapCompose, Join

def clean_value(value):
    """Nettoie les valeurs en supprimant les espaces et en convertissant None en 0"""
    if value is None:
        return '0'
    return value.strip() if isinstance(value, str) else value

class PlayerClutchStats(scrapy.Item):
    player_name = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    team = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    quarter = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    minutes = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    points = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    field_goals = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    field_goal_attempts = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    free_throws = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    free_throw_attempts = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    three_point_field_goals = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    three_point_field_goal_attempts = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    rebounds = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    assists = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    steals = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    blocks = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    turnovers = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    personal_fouls = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    match_date = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    source_url = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )

class ShotChartData(scrapy.Item):
    """Données pour le shot chart d'un joueur"""
    player_name = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    player_id = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    season = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    game_date = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    teams = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    quarter = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    time_remaining = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    shot_type = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    shot_distance = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    is_made = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    score_description = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    x_coordinate = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    y_coordinate = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
    source_url = scrapy.Field(
        input_processor=MapCompose(clean_value),
        output_processor=TakeFirst()
    )
