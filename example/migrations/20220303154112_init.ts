import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('user'))) {
    await knex.schema.createTable('user', table => {
      table.increments('id')
      table.string('username', 64).notNullable().unique()
      table.string('domain', 32).notNullable()
      table.timestamps(false, true)
    })
  }

  if (!(await knex.schema.hasTable('forum'))) {
    await knex.schema.createTable('forum', table => {
      table.increments('id')
      table.text('name').notNullable()
      table.integer('level', 11).nullable()
      table.timestamps(false, true)
    })
  }

  if (!(await knex.schema.hasTable('thread'))) {
    await knex.schema.createTable('thread', table => {
      table.increments('id')
      table.integer('user_id', 10).unsigned().notNullable().references('user.id')
      table.text('topic').notNullable()
      table.enum('status', ['active', 'pending']).notNullable()
      table.integer('forum_id', 10).unsigned().notNullable().references('forum.id')
      table.timestamps(false, true)
    })
  }

  if (!(await knex.schema.hasTable('post'))) {
    await knex.schema.createTable('post', table => {
      table.increments('id')
      table.integer('reply_id', 10).unsigned().nullable().references('post.id')
      table.integer('user_id', 10).unsigned().notNullable().references('user.id')
      table.integer('thread_id', 10).unsigned().notNullable().references('thread.id')
      table.text('content').notNullable()
      table.timestamps(false, true)
    })
  }

  if (!(await knex.schema.hasTable('like'))) {
    await knex.schema.createTable('like', table => {
      table.integer('user_id', 10).unsigned().notNullable().references('user.id')
      table.integer('post_id', 10).unsigned().notNullable().references('post.id')
      table.timestamps(false, true)
    })
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('like')
  await knex.schema.dropTableIfExists('post')
  await knex.schema.dropTableIfExists('thread')
  await knex.schema.dropTableIfExists('forum')
  await knex.schema.dropTableIfExists('user')
}
