import Infographic from './Infographic'
import ServiceExpandable from './ServiceExpandable'

export default function OurServices() {
	return (
		<div className="pt-8 xl:pt-20 pb-16 xl:pb-32 w-[90%] xl:w-[75%] mx-auto">
			<h3 className="font-unna font-bold text-xl xl:text-[48px] text-center text-black mb-8 xl:mb-16">
				Our Services
			</h3>
			<div className="mx-auto max-w-3xl">
				<ServiceExpandable title="Service 1">
					<p>
						Lorem ipsum dolor sit amet consectetur adipisicing elit.
						Doloremque laboriosam neque reprehenderit saepe eius
						dolorum vel consequuntur perspiciatis ad vero.
					</p>
				</ServiceExpandable>
				<ServiceExpandable title="Service 2">
					<p>
						Lorem ipsum dolor sit amet consectetur adipisicing elit.
						Doloremque laboriosam neque reprehenderit saepe eius
						dolorum vel consequuntur perspiciatis ad vero.
					</p>
				</ServiceExpandable>
				<ServiceExpandable title="Service 3">
					<p>
						Lorem ipsum dolor sit amet consectetur adipisicing elit.
						Doloremque laboriosam neque reprehenderit saepe eius
						dolorum vel consequuntur perspiciatis ad vero.
					</p>
				</ServiceExpandable>
				<ServiceExpandable title="Service 4">
					<p>
						Lorem ipsum dolor sit amet consectetur adipisicing elit.
						Doloremque laboriosam neque reprehenderit saepe eius
						dolorum vel consequuntur perspiciatis ad vero.
					</p>
				</ServiceExpandable>
			</div>
		</div>
	)
}
