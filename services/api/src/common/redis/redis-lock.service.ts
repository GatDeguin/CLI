import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

const DEFAULT_LOCK_TTL_MS = Number(process.env.REDIS_LOCK_TTL_MS ?? '30000');

@Injectable()
export class RedisLockService implements OnModuleDestroy {
  private readonly client = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    lazyConnect: true,
    maxRetriesPerRequest: 1
  });

  async acquire(lockKey: string, owner: string, ttlMs = DEFAULT_LOCK_TTL_MS): Promise<boolean> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }

    const result = await this.client.set(lockKey, owner, 'PX', ttlMs, 'NX');
    return result === 'OK';
  }

  async release(lockKey: string, owner: string): Promise<void> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }

    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    await this.client.eval(script, 1, lockKey, owner);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status !== 'end') {
      await this.client.quit();
    }
  }
}
