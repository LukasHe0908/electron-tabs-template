import React from 'react';
import { Spinner } from '@heroui/react';

export default function App() {
  return <Loading></Loading>;
}
export function Loading() {
  return (
    <div className='h-full flex justify-center items-center'>
      <Spinner className='pb-4' label='Loading...' size='lg' color='primary' labelColor='primary' />
    </div>
  );
}
